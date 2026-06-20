"""
Migration — institution details verification flags.

Adds 5 new columns to the institutions table:
  - institution_subtype TEXT (nullable)
  - student_count_verified     BOOLEAN NOT NULL DEFAULT false
  - staff_count_verified       BOOLEAN NOT NULL DEFAULT false
  - institution_subtype_verified BOOLEAN NOT NULL DEFAULT false
  - location_verified          BOOLEAN NOT NULL DEFAULT false

Backfills institution_subtype from `board` for school-category institutions where
board already matches one of the allowed school subtype values (CBSE, ICSE, State Board).
The `board` column is left in place — it is still used by the dashboard hero pills and
other display code; institution_subtype is the NEW verified-identity concept.

All *_verified columns default to false — none of the pre-existing registration data
counts as verified until an admin explicitly confirms it.

Safe to re-run: ADD COLUMN IF NOT EXISTS; UPDATE only where institution_subtype IS NULL.
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
        print("  EduPrivacy AI — Institution Details Migration")
        print("=" * 60)

        # Step 1: add columns
        await conn.execute(
            """
            ALTER TABLE institutions
                ADD COLUMN IF NOT EXISTS institution_subtype TEXT,
                ADD COLUMN IF NOT EXISTS student_count_verified     BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS staff_count_verified       BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS institution_subtype_verified BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS location_verified          BOOLEAN NOT NULL DEFAULT false
            """
        )
        print("  [OK] Columns added (or already existed)")

        # Step 2: backfill institution_subtype from board for school institutions
        result = await conn.execute(
            """
            UPDATE institutions
            SET institution_subtype = board
            WHERE category = 'school'
              AND board IN ('CBSE', 'ICSE', 'State Board')
              AND institution_subtype IS NULL
            """
        )
        count = int(result.split()[-1])
        print(f"  [OK] Backfilled institution_subtype for {count} school institution(s)")

        # Step 3: summary
        rows = await conn.fetch(
            """
            SELECT name, category, institution_subtype,
                   location_verified, student_count_verified,
                   staff_count_verified, institution_subtype_verified
            FROM institutions
            ORDER BY name
            """
        )
        print(f"\n  Current state ({len(rows)} institution(s)):")
        for r in rows:
            subtype = r["institution_subtype"] or "(none)"
            print(f"    {r['name']:<36} | {r['category']:<10} | subtype: {subtype}")

        print("\n  All *_verified flags are false — no pre-existing data is pre-verified.")
        print("=" * 60)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
