#!/usr/bin/env python3
"""
Ingest source documents into dpdp_embeddings.

Run from the backend/ directory:
    python scripts/ingest_dpdp.py

Processes:
  backend/docs/act/       — DPDP Act PDFs   (statute chunker)
  backend/docs/case_law/  — Court judgment PDFs (case-law chunker)

Re-runnable and idempotent: chunks whose text is unchanged are not re-embedded
(Cohere API quota is preserved). New or changed chunks are embedded and upserted.

Requires: EMBEDDING_PROVIDER=cohere + COHERE_API_KEY in .env
          DATABASE_URL pointing to a running PostgreSQL + pgvector instance
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings  # noqa: F401 — loads .env from correct absolute path
from ingestion.pipeline import run

if __name__ == "__main__":
    asyncio.run(run())
