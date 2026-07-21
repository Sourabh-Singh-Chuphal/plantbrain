"""
PlantBrain — FastAPI Application Entry Point
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import get_settings
from app.api import health, ingest, copilot, graph, compliance, admin

settings = get_settings()

app = FastAPI(
    title="PlantBrain API",
    description=(
        "AI-powered Industrial Knowledge Intelligence platform for Vindhya Steelworks. "
        "Exposes ingestion, RAG copilot, knowledge graph, compliance, and maintenance agents."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the configured frontend origin + localhost variants for dev
origins = [
    settings.frontend_origin,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(copilot.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


# ── Startup event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info(f"PlantBrain API starting — env={settings.app_env}")
    logger.info(f"ChromaDB persist dir: {settings.chroma_persist_dir}")
    logger.info(f"Frontend origin: {settings.frontend_origin}")

    # Verify ChromaDB is accessible
    try:
        from app.core.vector_store import get_vector_store
        collection = get_vector_store()
        logger.info(f"ChromaDB ready — {collection.count()} chunks in collection")
    except Exception as e:
        logger.warning(f"ChromaDB init warning: {e}")


    # Verify Neo4j (non-blocking)
    try:
        from app.core.graph_client import verify_connection
        connected = verify_connection()
        logger.info(f"Neo4j connected: {connected}")
    except Exception as e:
        logger.warning(f"Neo4j connection warning: {e}")


@app.api_route("/", methods=["GET", "HEAD"], tags=["root"])
async def root():
    return {
        "service": "PlantBrain API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health",
    }
