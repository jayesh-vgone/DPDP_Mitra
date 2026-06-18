"""
Phase 5 migration — run once against the already-running PostgreSQL instance.

Applies:
  1. CREATE TABLE institutions
  2. CREATE TABLE sessions
  3. ALTER TABLE users  (add email, password_hash, institution_id, role)

Safe to re-run — every statement uses IF NOT EXISTS / IF NOT EXISTS column guards.

Usage (from backend/ directory):
    python scripts/migrate_phase5.py
"""

import asyncio
from pathlib import Path

import asyncpg
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent.parent / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]

DDL = """
-- Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- institutions table
CREATE TABLE IF NOT EXISTS institutions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    board           TEXT,
    location        TEXT,
    student_count   INTEGER,
    staff_count     INTEGER,
    invite_code     TEXT UNIQUE NOT NULL,
    plan            TEXT NOT NULL DEFAULT 'Basic',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     TEXT NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend users table — each ALTER is guarded so re-runs are harmless
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='email'
    ) THEN
        ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='institution_id'
    ) THEN
        ALTER TABLE users ADD COLUMN institution_id UUID REFERENCES institutions(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='role'
    ) THEN
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';
    END IF;
END $$;
"""


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(DDL)
        print("[OK] Phase 5 migration applied successfully.")
        print("   Tables:   institutions, sessions")
        print("   Altered:  users (email, password_hash, institution_id, role)")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
