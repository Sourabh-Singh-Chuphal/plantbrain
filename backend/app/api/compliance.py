"""
PlantBrain — Compliance Router
POST /api/compliance/check
GET  /api/compliance/gaps
GET  /api/compliance/evidence (download markdown package)
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from loguru import logger

from app.models.schemas import ComplianceClause, ComplianceReport

router = APIRouter()


@router.post("/compliance/check", response_model=ComplianceReport, tags=["compliance"])
async def run_compliance_check(
    regulation_doc_id: str = Query(..., description="doc_id of the regulation document"),
    procedure_doc_ids: list[str] = Query(default=[], description="doc_ids of procedure documents to check against"),
) -> ComplianceReport:
    """
    Run a full compliance check: extract clauses from regulation, retrieve
    matching procedure excerpts, and judge coverage for each clause.
    """
    try:
        from app.services.agents.compliance import check_compliance
        report = check_compliance(
            regulation_doc_id=regulation_doc_id,
            procedure_doc_ids=procedure_doc_ids,
        )
        return report
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Compliance check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance/gaps", response_model=list[ComplianceClause], tags=["compliance"])
async def get_open_gaps() -> list[ComplianceClause]:
    """
    Return all open compliance gaps from the most recent compliance run.
    Used by the dashboard widget.
    """
    from app.services.agents.compliance import get_open_gaps
    return get_open_gaps()


@router.get("/compliance/evidence", response_class=PlainTextResponse, tags=["compliance"])
async def download_evidence_package() -> str:
    """
    Download the compliance evidence package as markdown (audit trail).
    """
    from app.services.agents.compliance import _LAST_REPORT, generate_compliance_evidence_package
    if _LAST_REPORT is None:
        raise HTTPException(status_code=404, detail="No compliance report generated yet. Run /compliance/check first.")
    return generate_compliance_evidence_package(_LAST_REPORT)


@router.get("/compliance/alerts", tags=["compliance"])
async def get_pattern_alerts() -> list[dict]:
    """
    Return lessons-learned pattern alerts (proactive dashboard banner).
    """
    from app.services.agents.lessons_learned import generate_alerts
    try:
        return generate_alerts()
    except Exception as e:
        logger.warning(f"Alert generation failed: {e}")
        return []


@router.post("/maintenance/diagnose", tags=["maintenance"])
async def diagnose_failure(symptom: str = Query(...)) -> dict:
    """
    Given a failure symptom, retrieve related documents and synthesize
    a ranked root-cause analysis.
    """
    from app.services.agents.maintenance import diagnose
    try:
        return diagnose(symptom)
    except Exception as e:
        logger.error(f"Diagnosis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lessons-learned/alerts", tags=["lessons-learned"])
async def get_lessons_learned_alerts() -> list[dict]:
    """
    Return all proactive pattern alerts detected across the knowledge graph.
    The GB-14 pattern should always appear here.
    """
    from app.services.agents.lessons_learned import generate_alerts
    try:
        return generate_alerts()
    except Exception as e:
        logger.warning(f"Lessons-learned alerts failed: {e}")
        return []
