"""
Sentinel — Core Configuration
Loads all environment variables via pydantic-settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LLM (Google Gemini — free tier via Google AI Studio)
    gemini_api_key: str = ""

    # Neo4j
    neo4j_uri: str = ""
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"
    chroma_collection_name: str = "sentinel_docs"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # App
    app_env: str = "development"
    log_level: str = "INFO"

    # Embedding model (sentence-transformers)
    embedding_model: str = "all-MiniLM-L6-v2"

    # Chunking
    chunk_size: int = 700
    chunk_overlap: int = 100

    # RAG
    retrieval_top_k: int = 6


@lru_cache()
def get_settings() -> Settings:
    return Settings()
