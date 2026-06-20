"""
Provision an admin panel account (one-off). No public admin signup exists.

Reads credentials from env (ADMIN_EMAIL / ADMIN_PASSWORD) or falls back to
sensible local-dev defaults, printed clearly on completion. Safe to re-run:
if the email already exists, its password is reset to the given value.

Usage (from backend/ directory):
    python scripts/seed_admin.py
    ADMIN_EMAIL=expert@dpdp.in ADMIN_PASSWORD=secret123 python scripts/seed_admin.py
"""

import asyncio
from pathlib import Path
import os

import asyncpg
import bcrypt
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@dpdp.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin12345")


async def run():
    pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Upsert: insert, or reset the password if the email already exists.
        await conn.execute(
            """
            INSERT INTO admin_users (email, password_hash)
            VALUES ($1, $2)
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
            """,
            ADMIN_EMAIL,
            pw_hash,
        )
        print(f"\n{'='*60}")
        print("  DPDP Mitra -- Admin account provisioned")
        print(f"{'='*60}")
        print(f"  email    : {ADMIN_EMAIL}")
        print(f"  password : {ADMIN_PASSWORD}")
        print("  Log in at /admin/login")
        print(f"{'='*60}\n")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
