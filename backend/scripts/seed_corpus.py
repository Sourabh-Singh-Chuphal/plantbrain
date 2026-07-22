"""
Sentinel — Corpus Seed Script
Ingests all documents from /data/sample_documents/ into ChromaDB + Neo4j.
Idempotent: skips ingestion if corpus already populated.

Usage (from /backend directory):
    python scripts/seed_corpus.py

Or via API:  POST /api/admin/seed
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Make sure the backend package is importable
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from loguru import logger

# Load .env
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from app.core.vector_store import get_vector_store
from app.services.ingestion import ingest_document

DATA_DIR = BACKEND_DIR.parent / "data" / "sample_documents"

# Only ingest these extensions (skip .pdf if .txt version exists — prefer txt for speed)
SUPPORTED_EXTS = {".txt", ".pdf", ".docx", ".xlsx"}

# Minimum chunks expected after full corpus ingestion
SEED_THRESHOLD = 50


def should_skip_seeding() -> bool:
    """Return True if the corpus is already populated."""
    collection = get_vector_store()
    count = collection.count()
    if count >= SEED_THRESHOLD:
        logger.info(f"Corpus already seeded ({count} chunks found) — skipping re-ingestion.")
        return True
    logger.info(f"Corpus has {count} chunks (below threshold {SEED_THRESHOLD}) — seeding now.")
    return False


def collect_files(data_dir: Path) -> list[Path]:
    """
    Collect all seedable files. For documents that exist as both .pdf and .txt,
    prefer .txt for speed (no OCR needed). Skip .pdf if same-stem .txt exists.
    """
    all_files = list(data_dir.rglob("*"))
    txt_stems = {f.stem for f in all_files if f.suffix == ".txt"}

    selected = []
    for f in sorted(all_files):
        if f.suffix not in SUPPORTED_EXTS:
            continue
        if f.suffix == ".pdf" and f.stem in txt_stems:
            # Skip PDF — use the TXT version instead
            continue
        selected.append(f)

    return selected


def seed_corpus(force: bool = False) -> dict:
    """
    Main seed function.
    Returns summary dict: {files_processed, chunks_created, skipped, errors}
    """
    if not force and should_skip_seeding():
        collection = get_vector_store()
        return {
            "files_processed": 0,
            "chunks_created": 0,
            "total_chunks": collection.count(),
            "skipped": True,
            "errors": [],
        }

    if not DATA_DIR.exists():
        raise FileNotFoundError(f"Data directory not found: {DATA_DIR}")

    files = collect_files(DATA_DIR)
    logger.info(f"Found {len(files)} files to ingest from {DATA_DIR}")

    total_chunks = 0
    errors = []
    t_start = time.perf_counter()

    for i, fpath in enumerate(files, 1):
        logger.info(f"[{i}/{len(files)}] Ingesting: {fpath.name}")
        try:
            file_bytes = fpath.read_bytes()
            summary = ingest_document(file_bytes, fpath.name)
            total_chunks += summary.chunks_created
            logger.info(
                f"  ✓ {fpath.name}: {summary.chunks_created} chunks, "
                f"{len(summary.entities_found.equipment_tags)} equipment tags, "
                f"{summary.processing_time_s:.1f}s"
            )
        except Exception as e:
            logger.error(f"  ✗ {fpath.name}: {e}")
            errors.append({"file": fpath.name, "error": str(e)})

    elapsed = time.perf_counter() - t_start
    collection = get_vector_store()
    final_count = collection.count()

    logger.info(
        f"\n{'='*60}\n"
        f"Seed complete: {len(files)} files processed in {elapsed:.1f}s\n"
        f"Total chunks in ChromaDB: {final_count}\n"
        f"Errors: {len(errors)}\n"
        f"{'='*60}"
    )

    return {
        "files_processed": len(files),
        "chunks_created": total_chunks,
        "total_chunks": final_count,
        "skipped": False,
        "errors": errors,
        "elapsed_s": round(elapsed, 1),
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Sentinel corpus seeder")
    parser.add_argument("--force", action="store_true", help="Force re-ingestion even if corpus exists")
    args = parser.parse_args()

    result = seed_corpus(force=args.force)
    print("\nSeed result:", result)
