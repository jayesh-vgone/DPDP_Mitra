"""
Migration: add email_verified to users + create email_otps table.

Run once against the live DB:
    python scripts/migrate_email_otp.py

Idempotent — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it is safe to
re-run. The backfill UPDATE is also safe to run multiple times.

IMPORTANT — backfill rule:
  The DEFAULT false applies to NEW inserts going forward.
  All pre-existing rows are immediately set to true so that no current user
  is retroactively locked out.
"""

import asyncio
import sys
from pathlib import Path

# Allow imports from the backend root
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings
import asyncpg


async def main() -> None:
    if not settings.database_url:
        sys.exit("DATABASE_URL is not set — check your .env file.")

    conn = await asyncpg.connect(settings.database_url)
    try:
        print("Running email OTP migration…")

        # ── 1. Add email_verified to users ────────────────────────────────────
        await conn.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false
        """)
        print("  ✓ users.email_verified column added (or already existed)")

        # Backfill: every existing row is treated as already verified so that
        # current users are not locked out.
        result = await conn.execute("""
            UPDATE users
            SET email_verified = true
            WHERE email_verified = false
              AND created_at < now() - interval '1 second'
        """)
        print(f"  ✓ Backfilled {result.split()[-1]} existing user rows → email_verified = true")

        # ── 2. Create email_otps table ─────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS email_otps (
                id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id       TEXT NOT NULL REFERENCES users(id),
                purpose       TEXT NOT NULL DEFAULT 'registration',
                otp_hash      TEXT NOT NULL,
                expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
                attempts_count INTEGER NOT NULL DEFAULT 0,
                consumed_at   TIMESTAMP WITH TIME ZONE,
                created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
        """)
        print("  ✓ email_otps table created (or already existed)")

        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_email_otps_user_purpose
            ON email_otps(user_id, purpose)
        """)
        print("  ✓ idx_email_otps_user_purpose index created (or already existed)")

        print("\nMigration complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
