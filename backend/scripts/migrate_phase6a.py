"""
Phase 6a migration — run once against the already-running PostgreSQL instance.

Applies:
  1. ALTER TABLE institutions ADD COLUMN category (with CHECK constraint)
  2. CREATE TABLE assessment_questions
  3. CREATE TABLE assessment_attempts
  4. CREATE TABLE assessment_responses
  5. Index on assessment_attempts(institution_id, created_at DESC)

All statements are idempotent — safe to re-run.

Usage (from backend/ directory):
    python scripts/migrate_phase6a.py
"""

import asyncio
from pathlib import Path
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]

DDL = """
-- 1. Add category column to institutions.
--    DEFAULT 'school' makes this non-destructive for existing rows.
--    The seed script then updates each institution to its correct category.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'institutions' AND column_name = 'category'
    ) THEN
        ALTER TABLE institutions
            ADD COLUMN category TEXT NOT NULL DEFAULT 'school'
                CHECK (category IN ('school', 'higher_ed', 'edtech'));
    END IF;
END $$;

-- 2. assessment_questions — one row per question, tagged by institution_category.
--    institution_category drives which question set an institution sees.
--    category is one of the 8 DPDP risk categories.
CREATE TABLE IF NOT EXISTS assessment_questions (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_category TEXT NOT NULL
                             CHECK (institution_category IN ('school', 'higher_ed', 'edtech')),
    category             TEXT NOT NULL,
    question_text        TEXT NOT NULL,
    dpdp_section         TEXT,
    weight               NUMERIC NOT NULL DEFAULT 1.0,
    order_index          INTEGER NOT NULL,
    answer_type          TEXT NOT NULL DEFAULT 'scale'
                             CHECK (answer_type IN ('scale', 'boolean')),
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. assessment_attempts — one row per full submission.
--    Stores denormalized overall_score + category_scores so history queries
--    are a trivial SELECT without re-computing anything.
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id       UUID NOT NULL REFERENCES institutions(id),
    submitted_by_user_id TEXT REFERENCES users(id),
    overall_score        NUMERIC NOT NULL,
    category_scores      JSONB NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. assessment_responses — one row per answer inside an attempt.
--    Linked to attempt_id (NOT institution_id directly) so answers from
--    different submissions stay separated.
CREATE TABLE IF NOT EXISTS assessment_responses (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id   UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id  UUID NOT NULL REFERENCES assessment_questions(id),
    answer_value NUMERIC NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Composite index — makes "all attempts for institution, most recent first" fast.
CREATE INDEX IF NOT EXISTS idx_attempts_institution_time
    ON assessment_attempts(institution_id, created_at DESC);
"""


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(DDL)
        print("[OK] Phase 6a migration applied successfully.")
        print("   Altered:  institutions (category column)")
        print("   Created:  assessment_questions, assessment_attempts, assessment_responses")
        print("   Index:    idx_attempts_institution_time")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
