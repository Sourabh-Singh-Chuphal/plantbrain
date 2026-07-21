"""
PlantBrain — Compliance & Quality Agent
Maps regulatory clauses against procedure documents and flags gaps.
"""
from __future__ import annotations

import json
import re
import time
from datetime import datetime
from typing import Optional

from loguru import logger

from app.core.config import get_settings
from app.core.llm import call_claude, call_claude_json
from app.core.vector_store import get_vector_store
from app.models.schemas import (
    ComplianceClause,
    ComplianceReport,
    ComplianceStatus,
)

# ── Shared state — in-memory last report (for /compliance/gaps endpoint) ─────
_LAST_REPORT: Optional[ComplianceReport] = None


# ── Clause extraction from regulation document ────────────────────────────────

_CLAUSE_SYSTEM = "You are a precise regulatory document parser. Return ONLY valid JSON."

_CLAUSE_PROMPT = """Extract all discrete, numbered or atomic requirements from this regulatory document excerpt.
Each requirement should be a single obligation that can be independently verified against a procedure.

Return JSON array:
[
  {{"clause_id": "Clause 3.1", "clause_text": "The licensee shall ..."}},
  ...
]

DOCUMENT:
{text}"""


def _extract_clauses(regulation_text: str) -> list[dict]:
    """Use Claude to extract atomic requirement clauses from regulation text."""
    # Process in chunks of 3000 chars to avoid token limits
    all_clauses = []
    chunk_size = 3000
    for i in range(0, len(regulation_text), chunk_size):
        chunk = regulation_text[i : i + chunk_size]
        try:
            raw = call_claude_json(
                prompt=_CLAUSE_PROMPT.format(text=chunk),
                system=_CLAUSE_SYSTEM,
                max_tokens=1024,
            )
            # The prefill adds "{" — need to wrap in array brackets if not already
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                all_clauses.extend(parsed)
            elif isinstance(parsed, dict) and "clauses" in parsed:
                all_clauses.extend(parsed["clauses"])
        except Exception as e:
            logger.warning(f"Clause extraction chunk failed: {e}")

    logger.info(f"Extracted {len(all_clauses)} clauses from regulation")
    return all_clauses


# ── Per-clause compliance check ───────────────────────────────────────────────

_CHECK_SYSTEM = "You are a compliance auditor. Be precise and conservative — mark as 'covered' only when the procedure explicitly addresses the requirement."

_CHECK_PROMPT = """REGULATORY REQUIREMENT:
{clause_text}

BEST MATCHING PROCEDURE EXCERPT:
{excerpt}

Judge whether the procedure COVERS, PARTIALLY covers, or is MISSING coverage for the requirement.

Return JSON:
{{
  "status": "covered" | "partial" | "missing",
  "justification": "one sentence explaining your verdict",
  "matched_excerpt": "the exact excerpt phrase that best supports your verdict, or null"
}}"""


def _check_clause(clause_text: str, procedure_excerpts: list[str]) -> dict:
    """Ask Claude to judge if a clause is covered by the best matching excerpt."""
    best_excerpt = procedure_excerpts[0] if procedure_excerpts else "No relevant procedure content found."
    try:
        raw = call_claude_json(
            prompt=_CHECK_PROMPT.format(
                clause_text=clause_text,
                excerpt=best_excerpt[:1500],
            ),
            system=_CHECK_SYSTEM,
            max_tokens=256,
        )
        return json.loads(raw)
    except Exception as e:
        logger.warning(f"Clause check failed: {e}")
        return {
            "status": "missing",
            "justification": f"Check failed: {e}",
            "matched_excerpt": None,
        }


# ── Retrieval helper ──────────────────────────────────────────────────────────

def _retrieve_procedure_excerpts(
    clause_text: str,
    procedure_doc_ids: list[str],
    top_k: int = 3,
) -> list[str]:
    """Retrieve the most relevant procedure chunks for a given clause."""
    from sentence_transformers import SentenceTransformer
    settings = get_settings()

    # Lazy-load embedder
    if not hasattr(_retrieve_procedure_excerpts, "_model"):
        _retrieve_procedure_excerpts._model = SentenceTransformer(settings.embedding_model)

    embedding = _retrieve_procedure_excerpts._model.encode([clause_text])[0].tolist()
    collection = get_vector_store()

    where_filter = {"doc_id": {"$in": procedure_doc_ids}} if procedure_doc_ids else None

    try:
        results = collection.query(
            query_embeddings=[embedding],
            n_results=min(top_k, collection.count() or 1),
            where=where_filter,
            include=["documents"],
        )
        return results.get("documents", [[]])[0]
    except Exception as e:
        logger.warning(f"Retrieval for clause failed: {e}")
        return []


# ── Main entry point ──────────────────────────────────────────────────────────

def check_compliance(
    regulation_doc_id: str,
    procedure_doc_ids: list[str],
    regulation_text: Optional[str] = None,
) -> ComplianceReport:
    """
    Full compliance check pipeline:
    1. Extract clauses from regulation document
    2. For each clause, retrieve best matching procedure excerpt
    3. Ask Claude to judge: covered / partial / missing
    4. Return ComplianceReport
    """
    global _LAST_REPORT
    t_start = time.perf_counter()

    # Get regulation text from ChromaDB if not provided directly
    if not regulation_text:
        regulation_text = _fetch_document_text(regulation_doc_id)

    if not regulation_text:
        raise ValueError(f"No text found for regulation doc_id={regulation_doc_id}")

    # Step 1: Extract clauses
    clauses_raw = _extract_clauses(regulation_text)
    if not clauses_raw:
        # Fallback: use the full text as one clause for demo
        clauses_raw = [{"clause_id": "Full Document", "clause_text": regulation_text[:500]}]

    # Step 2-3: Check each clause
    compliance_clauses = []
    for cr in clauses_raw[:20]:  # cap at 20 clauses to control latency
        clause_id = cr.get("clause_id", "Unknown")
        clause_text = cr.get("clause_text", "")
        if not clause_text.strip():
            continue

        excerpts = _retrieve_procedure_excerpts(clause_text, procedure_doc_ids)
        verdict = _check_clause(clause_text, excerpts)

        try:
            status = ComplianceStatus(verdict.get("status", "missing"))
        except ValueError:
            status = ComplianceStatus.missing

        compliance_clauses.append(
            ComplianceClause(
                clause_id=clause_id,
                clause_text=clause_text,
                status=status,
                justification=verdict.get("justification", ""),
                matched_excerpt=verdict.get("matched_excerpt"),
            )
        )

    # Build summary counts
    summary = {
        "covered": sum(1 for c in compliance_clauses if c.status == ComplianceStatus.covered),
        "partial": sum(1 for c in compliance_clauses if c.status == ComplianceStatus.partial),
        "missing": sum(1 for c in compliance_clauses if c.status == ComplianceStatus.missing),
    }

    report = ComplianceReport(
        regulation_doc=regulation_doc_id,
        procedure_docs=procedure_doc_ids,
        clauses=compliance_clauses,
        generated_at=datetime.utcnow(),
        summary=summary,
    )
    _LAST_REPORT = report

    elapsed = time.perf_counter() - t_start
    logger.info(
        f"Compliance check complete in {elapsed:.1f}s: "
        f"{summary['covered']} covered, {summary['partial']} partial, {summary['missing']} missing"
    )
    return report


def get_open_gaps() -> list[ComplianceClause]:
    """Return all currently-open gaps from the last compliance run."""
    if _LAST_REPORT is None:
        return []
    return [c for c in _LAST_REPORT.clauses if c.status != ComplianceStatus.covered]


def generate_compliance_evidence_package(report: ComplianceReport) -> str:
    """
    Format the compliance report as a markdown string suitable for download/audit trail.
    """
    lines = [
        f"# Compliance Evidence Package",
        f"",
        f"**Regulation:** {report.regulation_doc}",
        f"**Procedure Documents:** {', '.join(report.procedure_docs)}",
        f"**Generated:** {report.generated_at.isoformat()}",
        f"",
        f"## Summary",
        f"- ✅ Covered: {report.summary.get('covered', 0)}",
        f"- ⚠️ Partial: {report.summary.get('partial', 0)}",
        f"- ❌ Missing: {report.summary.get('missing', 0)}",
        f"",
        f"## Detailed Findings",
        f"",
    ]
    for clause in report.clauses:
        icon = {"covered": "✅", "partial": "⚠️", "missing": "❌"}.get(clause.status.value, "?")
        lines += [
            f"### {icon} {clause.clause_id} — {clause.status.value.upper()}",
            f"**Requirement:** {clause.clause_text}",
            f"**Assessment:** {clause.justification}",
        ]
        if clause.matched_excerpt:
            lines += [f"**Evidence:** _{clause.matched_excerpt}_"]
        lines.append("")
    return "\n".join(lines)


def _fetch_document_text(doc_id: str) -> str:
    """Retrieve all chunks for a doc_id from ChromaDB and concatenate."""
    collection = get_vector_store()
    try:
        results = collection.get(
            where={"doc_id": doc_id},
            include=["documents"],
        )
        docs = results.get("documents", [])
        return "\n".join(docs)
    except Exception as e:
        logger.warning(f"Could not fetch text for doc_id={doc_id}: {e}")
        return ""
