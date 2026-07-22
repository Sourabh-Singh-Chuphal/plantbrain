"""
Sentinel — Neo4j Graph Client
"""
from functools import lru_cache
from neo4j import GraphDatabase, Driver
from app.core.config import get_settings


@lru_cache()
def get_graph_driver() -> Driver:
    """Return a cached Neo4j driver (singleton)."""
    settings = get_settings()
    return GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )


def verify_connection() -> bool:
    """Verify Neo4j connectivity. Returns True if connected."""
    try:
        driver = get_graph_driver()
        driver.verify_connectivity()
        return True
    except Exception:
        return False
