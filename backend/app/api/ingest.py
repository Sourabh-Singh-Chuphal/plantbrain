"""
Sentinel — Ingestion Router
POST /api/ingest — multipart file upload
"""
from __future__ import annotations

import time
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from loguru import logger

from app.models.schemas import IngestionSummary
from app.services.ingestion import ingest_document

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt", ".md", ".png", ".jpg", ".jpeg", ".tiff"}


@router.post("/ingest", response_model=IngestionSummary, tags=["ingestion"])
async def ingest_file(file: UploadFile = File(...)) -> IngestionSummary:
    """
    Upload a document and run the full ingestion pipeline:
    extract → chunk → entity extraction → embed → graph.
    Returns an ingestion summary with timing information.
    """
    from pathlib import Path
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    logger.info(f"Received upload: {file.filename} ({file.size or '?'} bytes)")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        summary = ingest_document(file_bytes, file.filename or "upload")
    except Exception as e:
        logger.error(f"Ingestion failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return summary


@router.get("/ingest/status", tags=["ingestion"])
async def ingestion_status():
    """Return current corpus size from ChromaDB."""
    try:
        from app.core.vector_store import get_vector_store
        collection = get_vector_store()
        return {"total_chunks": collection.count(), "status": "ok"}
    except Exception as e:
        return {"total_chunks": 0, "status": "error", "error": str(e)}
