"""
Migration: per-institution question ownership.

Adds assessment_questions.institution_id (nullable FK → institutions) and backfills
each existing institution with its own editable copy of its category's question set.

Semantics:
  - institution_id IS NULL  → category template (existing rows, preserved untouched)
  - institution_id = <uuid> → that institution's own independent, editable copy

IDEMPOTENT — safe to re-run:
  - ADD COLUMN / CREATE INDEX use IF NOT EXISTS.
  - The clone helper (queries.clone_template_questions_for_institution) skips any
    institution that already owns ≥1 scoped row, so re-running creates no duplicates.

Run (from backend/ directory, after the DB already has templates seeded):
    python scripts/migrate_per_institution_questions.py
"""

import asyncio
import sys
from pathlib import Path
import os

import asyncpg
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
from db.queries import clone_template_questions_for_institution  # noqa: E402

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # 1. Schema: nullable FK column + lookup index.
        await conn.execute(
            """
            ALTER TABLE assessment_questions
            ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id)
            """
        )
        await conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_questions_institution
            ON assessment_questions(institution_id)
            """
        )
        print("Schema: assessment_questions.institution_id ready (+ index).")

        # 2. Backfill: clone each institution's category template into scoped rows.
        institutions = await conn.fetch("SELECT id, name, category FROM institutions ORDER BY name")
        total_cloned = 0
        for inst in institutions:
            n = await clone_template_questions_for_institution(
                conn, str(inst["id"]), inst["category"]
            )
            total_cloned += n
            status = f"{n} cloned" if n else "skipped (already has its own set)"
            print(f"  {inst['name']:<35} [{inst['category']:<9}] -> {status}")

        print(f"\nBackfill complete: {total_cloned} question row(s) created "
              f"across {len(institutions)} institution(s).")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
