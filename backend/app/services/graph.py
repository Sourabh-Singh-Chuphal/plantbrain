"""
Sentinel — Knowledge Graph Service (Neo4j)
Handles document/entity nodes and cross-document pattern detection.
"""
from __future__ import annotations

from typing import Optional
from loguru import logger

from app.core.graph_client import get_graph_driver
from app.models.schemas import ExtractedEntities, GraphStats, PatternAlert, RelatedDocument


# ── Node upsert helpers ───────────────────────────────────────────────────────

def upsert_document_node(doc_metadata: dict) -> None:
    """Create or update a Document node in Neo4j."""
    driver = get_graph_driver()
    with driver.session() as session:
        session.run(
            """
            MERGE (d:Document {id: $id})
            SET d.filename     = $filename,
                d.document_type = $document_type,
                d.upload_date  = $upload_date
            """,
            id=doc_metadata["id"],
            filename=doc_metadata["filename"],
            document_type=doc_metadata.get("document_type", "unknown"),
            upload_date=doc_metadata.get("upload_date", ""),
        )
    logger.debug(f"Upserted Document node: {doc_metadata['id']}")


def link_entities(doc_id: str, entities: ExtractedEntities) -> None:
    """
    Create Equipment / Person / Regulation nodes and link them to the document.
    Uses MERGE to avoid duplicates.
    """
    driver = get_graph_driver()
    with driver.session() as session:
        # Equipment tags
        for tag in entities.equipment_tags:
            session.run(
                """
                MERGE (e:Equipment {tag: $tag})
                WITH e
                MATCH (d:Document {id: $doc_id})
                MERGE (d)-[:MENTIONS]->(e)
                """,
                tag=tag,
                doc_id=doc_id,
            )

        # Personnel
        for person in entities.personnel:
            session.run(
                """
                MERGE (p:Person {name: $name})
                WITH p
                MATCH (d:Document {id: $doc_id})
                MERGE (d)-[:MENTIONS]->(p)
                """,
                name=person,
                doc_id=doc_id,
            )

        # Regulatory references
        for ref in entities.regulatory_refs:
            session.run(
                """
                MERGE (r:Regulation {ref: $ref})
                WITH r
                MATCH (d:Document {id: $doc_id})
                MERGE (d)-[:REFERENCES]->(r)
                """,
                ref=ref,
                doc_id=doc_id,
            )

        # If it's an incident, also link equipment to Incident nodes
        if entities.document_type.value == "incident_report":
            for tag in entities.equipment_tags:
                session.run(
                    """
                    MERGE (inc:Incident {doc_id: $doc_id})
                    WITH inc
                    MATCH (e:Equipment {tag: $tag})
                    MERGE (e)-[:INVOLVED_IN]->(inc)
                    """,
                    doc_id=doc_id,
                    tag=tag,
                )

    logger.debug(f"Linked entities for doc_id={doc_id}")


# ── Query helpers ─────────────────────────────────────────────────────────────

def find_related_documents(equipment_tag: str) -> list[RelatedDocument]:
    """
    Return all documents mentioning a given equipment tag, ordered by date.
    """
    driver = get_graph_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (d:Document)-[:MENTIONS]->(e:Equipment {tag: $tag})
            RETURN d.id         AS doc_id,
                   d.filename   AS filename,
                   d.document_type AS document_type,
                   d.upload_date   AS date
            ORDER BY d.upload_date ASC
            """,
            tag=equipment_tag,
        )
        records = []
        for r in result:
            records.append(
                RelatedDocument(
                    document_id=r["doc_id"] or "",
                    filename=r["filename"] or "",
                    document_type=r["document_type"] or "unknown",
                    date=r["date"],
                    relationship="MENTIONS",
                )
            )
        return records


def find_cross_document_patterns(equipment_tag: str) -> list[PatternAlert]:
    """
    Detect the case where the same equipment tag appears in an incident-linked
    document AND in a later document — the lessons-learned pattern.
    Returns PatternAlert objects.
    """
    driver = get_graph_driver()
    alerts = []

    with driver.session() as session:
        # Find documents mentioning this tag
        result = session.run(
            """
            MATCH (d:Document)-[:MENTIONS]->(e:Equipment {tag: $tag})
            RETURN d.id          AS doc_id,
                   d.filename    AS filename,
                   d.document_type AS doc_type,
                   d.upload_date   AS date
            ORDER BY d.upload_date ASC
            """,
            tag=equipment_tag,
        )
        docs = [dict(r) for r in result]

    # Look for incident + later document pattern
    incident_docs = [d for d in docs if d.get("doc_type") in ("incident_report",)]
    work_docs = [d for d in docs if d.get("doc_type") in ("work_order", "inspection_report")]

    if incident_docs and work_docs:
        involved = [d["filename"] for d in incident_docs + work_docs]
        dates = [d["date"] for d in incident_docs + work_docs if d.get("date")]
        years = set()
        for date_str in dates:
            # extract year from any date string
            import re
            year_matches = re.findall(r"\b(20\d{2})\b", date_str or "")
            years.update(int(y) for y in year_matches)

        years_span = (max(years) - min(years)) if len(years) > 1 else 0

        alerts.append(
            PatternAlert(
                equipment_tag=equipment_tag,
                pattern_summary=(
                    f"{equipment_tag} appears in {len(incident_docs)} incident report(s) "
                    f"and {len(work_docs)} subsequent work order(s)/inspection(s). "
                    f"This recurring pattern spans {years_span} years and warrants review."
                ),
                documents_involved=involved,
                risk_level="high" if len(incident_docs) >= 1 and years_span >= 3 else "medium",
                years_span=years_span,
            )
        )

    return alerts


def graph_stats() -> GraphStats:
    """Return node/edge counts by type for the dashboard."""
    driver = get_graph_driver()
    with driver.session() as session:
        counts = session.run(
            """
            RETURN
              count{(d:Document)}         AS documents,
              count{(e:Equipment)}        AS equipment,
              count{(p:Person)}           AS persons,
              count{(i:Incident)}         AS incidents,
              count{(r:Regulation)}       AS regulations
            """
        ).single()

        edges = session.run(
            "MATCH ()-[r]->() RETURN count(r) AS total_edges"
        ).single()

    return GraphStats(
        documents=counts["documents"],
        equipment=counts["equipment"],
        persons=counts["persons"],
        incidents=counts["incidents"],
        regulations=counts["regulations"],
        total_edges=edges["total_edges"],
    )


def get_graph_data_for_explorer() -> dict:
    """
    Return all nodes + edges in a react-force-graph friendly format:
    { nodes: [{id, name, type}], links: [{source, target, label}] }
    """
    driver = get_graph_driver()
    with driver.session() as session:
        node_result = session.run(
            """
            MATCH (n)
            WHERE n:Document OR n:Equipment OR n:Person OR n:Regulation OR n:Incident
            RETURN
              id(n)       AS neo_id,
              labels(n)[0] AS label,
              CASE
                WHEN n:Document   THEN coalesce(n.filename, n.id)
                WHEN n:Equipment  THEN n.tag
                WHEN n:Person     THEN n.name
                WHEN n:Regulation THEN n.ref
                WHEN n:Incident   THEN 'Incident-' + n.doc_id
                ELSE 'Unknown'
              END AS name
            """
        )
        nodes = []
        neo_to_str = {}
        for r in node_result:
            node_id = str(r["neo_id"])
            neo_to_str[r["neo_id"]] = node_id
            nodes.append({
                "id": node_id,
                "name": r["name"] or "Unknown",
                "type": r["label"],
            })

        edge_result = session.run(
            """
            MATCH (a)-[r]->(b)
            RETURN id(a) AS src, id(b) AS tgt, type(r) AS rel_type
            """
        )
        links = []
        for r in edge_result:
            src = str(r["src"])
            tgt = str(r["tgt"])
            links.append({"source": src, "target": tgt, "label": r["rel_type"]})

    return {"nodes": nodes, "links": links}


def get_equipment_timeline(equipment_tag: str) -> list[dict]:
    """
    Return all documents related to an equipment tag, formatted for the timeline view.
    """
    docs = find_related_documents(equipment_tag)
    return [
        {
            "date": doc.date or "",
            "document_type": doc.document_type,
            "filename": doc.filename,
            "document_id": doc.document_id,
            "relationship": doc.relationship,
        }
        for doc in docs
    ]
