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

    # 1. Warm embedder model in memory (non-blocking)
    try:
        from app.core.embedding import get_embedder
        logger.info("Pre-warming SentenceTransformer model on startup...")
        get_embedder()
        logger.info("SentenceTransformer model successfully pre-warmed.")
    except Exception as e:
        logger.warning(f"Embedder pre-warm warning: {e}")

    # 2. Verify ChromaDB & Auto-seed if empty
    try:
        from app.core.vector_store import get_vector_store
        collection = get_vector_store()
        count = collection.count()
        logger.info(f"ChromaDB ready — {count} chunks in collection")

        if count < 10:
            logger.info("Corpus count below threshold (<10). Auto-seeding sample corpus on startup...")
            import asyncio
            from scripts.seed_corpus import seed_corpus
            asyncio.create_task(asyncio.to_thread(seed_corpus, False))
    except Exception as e:
        logger.warning(f"ChromaDB startup/auto-seed warning: {e}")

    # 3. Verify Neo4j (non-blocking)
    try:
        from app.core.graph_client import verify_connection
        connected = verify_connection()
        logger.info(f"Neo4j connected: {connected}")
    except Exception as e:
        logger.warning(f"Neo4j connection warning: {e}")

    # 4. Pre-warm Copilot Cache for demo queries
    try:
        from app.services.agents.copilot import prewarm_cache
        prewarm_cache([
            "What happened to sensor GB-14 in 2019 and how does it relate to the 2026 work orders?",
            "What is the recurring issue with Gas Blower GB-14 during hot work permits?",
            "PM-07 bearing failure RCA",
            "OISD-105 compliance check",
            "Hot work permit procedure"
        ])
        logger.info("Copilot demo cache successfully pre-warmed.")
    except Exception as e:
        logger.warning(f"Copilot cache pre-warm warning: {e}")


@app.api_route("/", methods=["GET", "HEAD"], tags=["root"])
async def root():
    return {
        "service": "PlantBrain API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health",
    }
