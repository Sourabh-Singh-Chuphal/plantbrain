"""
PlantBrain — Health Check Router
"""
from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.core.config import get_settings

router = APIRouter()


@router.api_route("/health", methods=["GET", "HEAD"], response_model=HealthResponse, tags=["system"])
async def health_check():
    """
    System health check.
    Returns ChromaDB chunk count, Neo4j connectivity, and app environment.
    """
    settings = get_settings()

    # ChromaDB chunk count
    chroma_chunks = 0
    try:
        from app.core.vector_store import get_vector_store
        collection = get_vector_store()
        chroma_chunks = collection.count()
    except Exception:
        pass

    # Neo4j connectivity
    neo4j_connected = False
    try:
        from app.core.graph_client import verify_connection
        neo4j_connected = verify_connection()
    except Exception:
        pass

    return HealthResponse(
        status="ok",
        chroma_chunks=chroma_chunks,
        neo4j_connected=neo4j_connected,
        app_env=settings.app_env,
    )
