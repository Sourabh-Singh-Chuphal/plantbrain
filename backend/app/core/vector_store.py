"""
Sentinel — ChromaDB Vector Store Client
"""
from functools import lru_cache
import chromadb
from app.core.config import get_settings


@lru_cache()
def get_vector_store() -> chromadb.Collection:
    """Return the persistent ChromaDB collection (singleton)."""
    settings = get_settings()
    client = chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
    )
    collection = client.get_or_create_collection(
        name=settings.chroma_collection_name,
        metadata={"hnsw:space": "cosine"},
    )
    return collection


def get_chroma_client() -> chromadb.PersistentClient:
    """Return the raw ChromaDB client (for admin operations)."""
    settings = get_settings()
    return chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=ChromaSettings(anonymized_telemetry=False),
    )
