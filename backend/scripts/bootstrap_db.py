"""
One-off database bootstrap for a fresh deployment.

Applies db/init.sql (the complete schema — all CREATE ... IF NOT EXISTS, so it is
safe and idempotent) against the database pointed to by DATABASE_URL. Run this once
after provisioning a new Postgres instance (e.g. on Render), BEFORE seeding.

It does NOT seed data — run the seed scripts separately afterwards:
    python scripts/bootstrap_db.py        # schema (this file)
    python scripts/seed_institutions.py   # demo institutions + invite codes
    python scripts/seed_questions.py       # assessment question bank
    python scripts/seed_admin.py           # admin panel account
    python scripts/ingest_dpdp.py          # optional: RAG embeddings (needs PDF + COHERE key)

Requires:
    DATABASE_URL in the environment (or backend/.env for local use).
    The DB user must be allowed to CREATE EXTENSION vector / uuid-ossp
    (Render's default Postgres user can).
"""

import asyncio
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).parent.parent
load_dotenv(BACKEND_DIR / ".env")  # no-op if the file is absent (e.g. on Render)
DATABASE_URL = os.environ["DATABASE_URL"]
INIT_SQL = BACKEND_DIR / "db" / "init.sql"


async def run() -> None:
    print("=" * 60)
    print("  EduPrivacy AI — DB bootstrap (apply init.sql)")
    print("=" * 60)

    sql = INIT_SQL.read_text(encoding="utf-8")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # asyncpg runs a multi-statement string via the simple query protocol
        # as long as there are no bound parameters (init.sql has none).
        await conn.execute(sql)
        print("  [OK] Schema applied (idempotent).")

        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
        print(f"\n  Tables present ({len(tables)}):")
        for t in tables:
            print(f"    - {t['tablename']}")

        print("\n  Next: run the seed scripts (institutions, questions, admin).")
        print("=" * 60)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
