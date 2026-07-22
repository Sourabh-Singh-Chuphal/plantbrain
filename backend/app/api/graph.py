"""
Sentinel — Graph Router
GET /api/graph/stats
GET /api/graph/equipment/{tag}/related
GET /api/graph/equipment/{tag}/patterns
GET /api/graph/explorer
GET /api/graph/equipment/{tag}/timeline
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from loguru import logger

from app.models.schemas import GraphStats, PatternAlert, RelatedDocument

router = APIRouter()


@router.get("/graph/stats", response_model=GraphStats, tags=["graph"])
async def get_graph_stats() -> GraphStats:
    """Return node/edge counts by type for the dashboard."""
    try:
        from app.services.graph import graph_stats
        return graph_stats()
    except Exception as e:
        logger.warning(f"Graph stats failed: {e}")
        # Return zeros rather than erroring — graph may not be configured
        return GraphStats()


@router.get("/graph/equipment/{tag}/related", response_model=list[RelatedDocument], tags=["graph"])
async def get_related_documents(tag: str) -> list[RelatedDocument]:
    """Return all documents mentioning a given equipment tag."""
    try:
        from app.services.graph import find_related_documents
        return find_related_documents(tag.upper())
    except Exception as e:
        logger.error(f"Related documents query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/equipment/{tag}/patterns", response_model=list[PatternAlert], tags=["graph"])
async def get_cross_document_patterns(tag: str) -> list[PatternAlert]:
    """Detect cross-document patterns for a given equipment tag."""
    try:
        from app.services.graph import find_cross_document_patterns
        return find_cross_document_patterns(tag.upper())
    except Exception as e:
        logger.error(f"Pattern detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/explorer", tags=["graph"])
async def get_graph_explorer_data() -> dict:
    """Return all nodes and edges for the react-force-graph explorer."""
    try:
        from app.services.graph import get_graph_data_for_explorer
        return get_graph_data_for_explorer()
    except Exception as e:
        logger.warning(f"Graph explorer data failed: {e}")
        # Return empty graph if Neo4j unavailable
        return {"nodes": [], "links": []}


@router.get("/graph/equipment/{tag}/timeline", tags=["graph"])
async def get_equipment_timeline(tag: str) -> list[dict]:
    """Return chronological timeline for an equipment tag."""
    try:
        from app.services.graph import get_equipment_timeline
        return get_equipment_timeline(tag.upper())
    except Exception as e:
        logger.error(f"Timeline query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
