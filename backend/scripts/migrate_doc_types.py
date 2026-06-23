#!/usr/bin/env python3
"""
Idempotent migration: add doc_type, source_filename, doc_title columns to dpdp_embeddings.
Backfills all existing rows (ingested from the DPDP Act PDF) with the correct values.

Run from the backend/ directory:
    python scripts/migrate_doc_types.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings  # noqa: F401 — loads .env from correct path

BACKFILL_SOURCE = "DPDP.pdf"
BACKFILL_TITLE  = "The Digital Personal Data Protection Act, 2023"


async def migrate() -> None:
    if not settings.database_url:
        print("ERROR: DATABASE_URL is not set in .env.")
        sys.exit(1)

    import asyncpg
    conn = await asyncpg.connect(settings.database_url)
    try:
        print("Adding doc_type column (if not exists)...")
        await conn.execute(
            "ALTER TABLE dpdp_embeddings ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'act';"
        )

        # Add CHECK constraint if not already present — idempotent via catalog check.
        constraint_exists = await conn.fetchval(
            """
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name       = 'dpdp_embeddings'
              AND constraint_name  = 'dpdp_embeddings_doc_type_check'
              AND constraint_type  = 'CHECK'
            """
        )
        if not constraint_exists:
            await conn.execute(
                """
                ALTER TABLE dpdp_embeddings
                    ADD CONSTRAINT dpdp_embeddings_doc_type_check
                    CHECK (doc_type IN ('act', 'case_law'));
                """
            )
            print("  Added CHECK constraint on doc_type.")
        else:
            print("  CHECK constraint already exists — skipping.")

        print("Adding source_filename column (if not exists)...")
        await conn.execute(
            "ALTER TABLE dpdp_embeddings ADD COLUMN IF NOT EXISTS source_filename TEXT;"
        )

        print("Adding doc_title column (if not exists)...")
        await conn.execute(
            "ALTER TABLE dpdp_embeddings ADD COLUMN IF NOT EXISTS doc_title TEXT;"
        )

        print("Backfilling existing rows where source_filename IS NULL...")
        updated = await conn.fetchval(
            """
            WITH upd AS (
                UPDATE dpdp_embeddings
                SET source_filename = $1,
                    doc_title       = $2
                WHERE source_filename IS NULL
                RETURNING 1
            )
            SELECT COUNT(*) FROM upd
            """,
            BACKFILL_SOURCE,
            BACKFILL_TITLE,
        )
        print(f"  Backfilled {updated} rows.")

        # Verification
        cols = await conn.fetch(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'dpdp_embeddings'
            ORDER BY ordinal_position
            """
        )
        print("\nCurrent dpdp_embeddings schema:")
        for c in cols:
            print(f"  {c['column_name']:<20} {c['data_type']}")

        total = await conn.fetchval("SELECT COUNT(*) FROM dpdp_embeddings")
        sample = await conn.fetch(
            "SELECT section, doc_type, source_filename FROM dpdp_embeddings LIMIT 3"
        )
        print(f"\nTotal rows: {total}")
        print("Sample rows:")
        for r in sample:
            print(f"  section={r['section']!r:<40} doc_type={r['doc_type']!r} source={r['source_filename']!r}")

        print("\nMigration complete.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
