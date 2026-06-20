"""
Admin-panel migration — run once against the already-running PostgreSQL instance.

Applies (all idempotent — safe to re-run):
  1. assessment_questions: ADD is_active BOOLEAN DEFAULT true, ADD updated_at
  2. assessment_responses: ADD snapshot columns (question_text, dpdp_section,
     weight, answer_type) so historical attempts are immune to later question edits
  3. Backfill the snapshot columns for all PRE-EXISTING responses from the live
     question values (best-effort — the stored attempt SCORES are already frozen
     in assessment_attempts, so this backfill changes no score, only the
     drill-down display source)
  4. CREATE TABLE admin_users   (separate from institution users)
  5. CREATE TABLE admin_sessions (separate from institution sessions)

Usage (from backend/ directory):
    python scripts/migrate_admin_questions.py
"""

import asyncio
from pathlib import Path
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]

DDL = """
-- 1. assessment_questions: editability metadata --------------------------------
ALTER TABLE assessment_questions
    ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE assessment_questions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 2. assessment_responses: per-answer snapshot of the question as it was at
--    submission time. Nullable because rows are written once and never updated;
--    new submissions always populate them, old rows are backfilled in step 3.
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS dpdp_section  TEXT;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS weight        NUMERIC;
ALTER TABLE assessment_responses ADD COLUMN IF NOT EXISTS answer_type   TEXT;

-- 3. Backfill snapshot for pre-existing responses from the current question row.
--    Only fills rows where the snapshot is still NULL, so re-runs are no-ops.
UPDATE assessment_responses r
SET question_text = q.question_text,
    dpdp_section  = q.dpdp_section,
    weight        = q.weight,
    answer_type   = q.answer_type
FROM assessment_questions q
WHERE r.question_id = q.id
  AND r.question_text IS NULL;

-- 4. admin_users — provisioned manually via seed_admin.py. No public signup.
CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. admin_sessions — server-side sessions for the admin panel.
--    Deliberately separate from `sessions` so an institution user and an admin
--    can be logged in simultaneously in the same browser without collision.
CREATE TABLE IF NOT EXISTS admin_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
"""


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(DDL)
        backfilled = await conn.fetchval(
            "SELECT count(*) FROM assessment_responses WHERE question_text IS NOT NULL"
        )
        print("[OK] Admin/questions migration applied successfully.")
        print("   Altered:  assessment_questions (is_active, updated_at)")
        print("   Altered:  assessment_responses (question_text, dpdp_section, weight, answer_type)")
        print(f"   Backfilled snapshot on {backfilled} existing response row(s)")
        print("   Created:  admin_users, admin_sessions")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
