"""
PlantBrain — Unified Embedding Service
Single persistent SentenceTransformer instance shared across ingestion & agents.
"""
from __future__ import annotations

from typing import List
from loguru import logger
from sentence_transformers import SentenceTransformer
from app.core.config import get_settings

_embedder_instance: SentenceTransformer | None = None


def get_embedder() -> SentenceTransformer:
    """Return singleton SentenceTransformer instance."""
    global _embedder_instance
    if _embedder_instance is None:
        settings = get_settings()
        logger.info(f"Loading SentenceTransformer model: '{settings.embedding_model}' ...")
        _embedder_instance = SentenceTransformer(settings.embedding_model)
        logger.info("SentenceTransformer model loaded successfully.")
    return _embedder_instance


def embed_text(text: str) -> List[float]:
    """Embed a single string into a vector."""
    model = get_embedder()
    embedding = model.encode([text])[0]
    return embedding.tolist()


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of strings into vectors."""
    if not texts:
        return []
    model = get_embedder()
    embeddings = model.encode(texts)
    return embeddings.tolist()
