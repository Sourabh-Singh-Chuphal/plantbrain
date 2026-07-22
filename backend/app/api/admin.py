"""
Sentinel — Admin Router
POST /api/admin/seed — trigger corpus seeding
GET  /api/admin/cache/clear — clear copilot response cache
"""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException
from loguru import logger

router = APIRouter()


@router.post("/admin/seed", tags=["admin"])
async def seed_corpus(background_tasks: BackgroundTasks, force: bool = False):
    """
    Trigger corpus ingestion from /data/sample_documents/.
    Idempotent — skips if corpus already populated (unless force=true).
    Runs as background task and returns immediately.
    """
    def _run_seed():
        try:
            import sys
            from pathlib import Path
            # Ensure the script path is findable
            backend_dir = Path(__file__).parent.parent.parent
            sys.path.insert(0, str(backend_dir))
            from scripts.seed_corpus import seed_corpus as _seed
            result = _seed(force=force)
            logger.info(f"Background seed complete: {result}")
        except Exception as e:
            logger.error(f"Background seed failed: {e}")

    background_tasks.add_task(_run_seed)
    return {"status": "seeding started", "force": force}


@router.delete("/admin/cache", tags=["admin"])
async def clear_copilot_cache():
    """Clear the in-memory copilot response cache."""
    from app.services.agents.copilot import _RESPONSE_CACHE
    _RESPONSE_CACHE.clear()
    return {"status": "cache cleared"}
