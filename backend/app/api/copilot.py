"""
PlantBrain — Copilot Router
POST /api/copilot/query — RAG-grounded chat
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from loguru import logger

from app.models.schemas import CopilotRequest, CopilotResponse
from app.services.agents.copilot import answer_query, prewarm_cache

router = APIRouter()


@router.post("/copilot/query", response_model=CopilotResponse, tags=["copilot"])
async def query_copilot(request: CopilotRequest) -> CopilotResponse:
    """
    Expert Copilot: RAG-grounded answer with citations.
    Checks response cache first — if warm, returns instantly.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        response = answer_query(request.question, session_id=request.session_id)
    except Exception as e:
        logger.error(f"Copilot query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Copilot error: {str(e)}")

    return response


@router.post("/copilot/prewarm", tags=["copilot"])
async def prewarm(questions: list[str]):
    """Pre-warm the response cache for demo reliability."""
    if not questions:
        raise HTTPException(status_code=400, detail="Provide at least one question.")
    try:
        prewarm_cache(questions)
        return {"status": "ok", "warmed": len(questions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
