"""
Sentinel — Maintenance / RCA Agent
Given a failure symptom, synthesizes root causes from work orders + OEM manuals + incidents.
"""
from __future__ import annotations

import time
from loguru import logger

from app.core.llm import call_claude
from app.core.config import get_settings
from app.core.vector_store import get_vector_store

_RCA_SYSTEM = """You are an expert industrial maintenance engineer and root-cause analyst at Vindhya Steelworks.
Your task is to diagnose equipment failures by reasoning over retrieved maintenance records,
OEM manual troubleshooting sections, and past incident reports.

Rules:
1. Rank root causes by likelihood — most probable first.
2. Cite every claim with [source: <document>].
3. Suggest a concrete next action for each root cause.
4. If past similar incidents exist in context, explicitly reference them."""

_RCA_PROMPT = """FAILURE SYMPTOM:
{symptom}

RELEVANT MAINTENANCE RECORDS & OEM DOCUMENTATION:
{context}

PAST INCIDENTS INVOLVING RELATED EQUIPMENT:
{incident_context}

Based ONLY on the above context, provide:
1. TOP 3 LIKELY ROOT CAUSES (ranked, each with probability estimate)
2. RELEVANT PAST INCIDENTS (if any)
3. RECOMMENDED NEXT ACTIONS"""


def diagnose(symptom: str) -> dict:
    """
    Given a failure symptom description, retrieve relevant documents
    and synthesize a root-cause analysis.
    """
    t_start = time.perf_counter()
    settings = get_settings()

    # Embed the symptom
    from sentence_transformers import SentenceTransformer
    if not hasattr(diagnose, "_model"):
        diagnose._model = SentenceTransformer(settings.embedding_model)
    embedding = diagnose._model.encode([symptom])[0].tolist()

    collection = get_vector_store()
    total = collection.count()

    if total == 0:
        return {
            "symptom": symptom,
            "root_causes": [],
            "recommended_actions": [],
            "raw_analysis": "No documents have been ingested yet. Please seed the corpus first.",
            "latency_ms": 0,
        }

    # Retrieve general maintenance + OEM context
    general_results = collection.query(
        query_embeddings=[embedding],
        n_results=min(6, total),
        include=["documents", "metadatas"],
    )

    # Retrieve incident-specific context
    incident_results = collection.query(
        query_embeddings=[embedding],
        n_results=min(3, total),
        where={"document_type": {"$in": ["incident_report", "work_order"]}},
        include=["documents", "metadatas"],
    )

    def _format_chunks(results: dict) -> str:
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        parts = []
        for doc, meta in zip(docs, metas):
            source = meta.get("source_document", "unknown")
            parts.append(f"[Source: {source}]\n{doc[:600]}")
        return "\n\n".join(parts) if parts else "No relevant context found."

    context = _format_chunks(general_results)
    incident_context = _format_chunks(incident_results)

    prompt = _RCA_PROMPT.format(
        symptom=symptom,
        context=context,
        incident_context=incident_context,
    )

    analysis = call_claude(
        prompt=prompt,
        system=_RCA_SYSTEM,
        max_tokens=1024,
        temperature=0.1,
    )

    latency_ms = round((time.perf_counter() - t_start) * 1000, 1)
    logger.info(f"RCA diagnosis completed in {latency_ms:.0f}ms")

    return {
        "symptom": symptom,
        "raw_analysis": analysis,
        "latency_ms": latency_ms,
    }
