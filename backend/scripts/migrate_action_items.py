"""
Migration — action_items (Dashboard remediation tracker / Action Queue).

Creates the action_items table used by the Dashboard's Action Queue panel.
Hybrid model:
  - auto-generated items (is_custom=false) are regenerated on every assessment
    submission (the POST /assessment/submit handler DELETEs all non-custom rows
    for the institution and re-inserts a fresh set);
  - custom items (is_custom=true) are user-added and never touched by regeneration.

Both kinds are fully editable and deletable via the action-items API.

Safe to re-run: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
"""

import asyncio
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]


async def run() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print("=" * 60)
        print("  EduPrivacy AI — Action Items Migration")
        print("=" * 60)

        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS action_items (
                id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                institution_id  UUID NOT NULL REFERENCES institutions(id),
                category        TEXT NOT NULL,
                task_text       TEXT NOT NULL,
                priority        TEXT NOT NULL,
                priority_level  TEXT NOT NULL,
                effort_estimate TEXT,
                status          TEXT NOT NULL DEFAULT 'not_started'
                                    CHECK (status IN ('not_started', 'in_progress', 'done')),
                is_custom       BOOLEAN NOT NULL DEFAULT false,
                created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
            """
        )
        print("  [OK] action_items table created (or already existed)")

        await conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_action_items_institution
                ON action_items(institution_id, priority)
            """
        )
        print("  [OK] index created (or already existed)")

        count = await conn.fetchval("SELECT COUNT(*) FROM action_items")
        print(f"\n  Current action_items rows: {count}")
        print("=" * 60)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
