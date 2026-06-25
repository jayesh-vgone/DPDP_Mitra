"""
Migration: Internal Audit module.

Creates three new tables:
  1. institution_category_scores — single source of truth for each institution's
     current per-category score, updated on assessment completion (all categories)
     and on internal audit completion (target categories only).
  2. internal_audits — one row per recurring 90-day audit cycle per institution.
  3. internal_audit_responses — individual question responses for each audit.

Backfills institution_category_scores from existing assessment_attempts so that
the source of truth is populated immediately for institutions that have already
completed assessments.

Safe to re-run (all DDL uses IF NOT EXISTS).
"""

import asyncio
import os
import sys
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


async def run():
    db_url = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(db_url)
    try:
        # ── 1. institution_category_scores ────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS institution_category_scores (
                institution_id  UUID NOT NULL REFERENCES institutions(id),
                category        TEXT NOT NULL,
                current_score   NUMERIC NOT NULL,
                source_type     TEXT NOT NULL CHECK (source_type IN ('assessment', 'internal_audit')),
                source_id       UUID NOT NULL,
                last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                PRIMARY KEY (institution_id, category)
            )
        """)
        print("✓ institution_category_scores table ready")

        # ── 2. internal_audits ────────────────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS internal_audits (
                id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                institution_id      UUID NOT NULL REFERENCES institutions(id),
                sequence_number     INTEGER NOT NULL,
                triggered_by_type   TEXT NOT NULL CHECK (triggered_by_type IN ('assessment', 'internal_audit')),
                triggered_by_id     UUID NOT NULL,
                target_categories   JSONB NOT NULL DEFAULT '[]',
                due_date            DATE NOT NULL,
                status              TEXT NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'in_progress', 'completed')),
                started_at          TIMESTAMP WITH TIME ZONE,
                completed_at        TIMESTAMP WITH TIME ZONE,
                audit_score_snapshot JSONB,
                created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                UNIQUE (institution_id, sequence_number)
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_internal_audits_institution
            ON internal_audits (institution_id, created_at DESC)
        """)
        print("✓ internal_audits table ready")

        # ── 3. internal_audit_responses ───────────────────────────────────────
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS internal_audit_responses (
                id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                internal_audit_id   UUID NOT NULL REFERENCES internal_audits(id) ON DELETE CASCADE,
                question_id         UUID NOT NULL REFERENCES assessment_questions(id),
                answer_value        NUMERIC NOT NULL,
                created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_responses_audit
            ON internal_audit_responses (internal_audit_id)
        """)
        print("✓ internal_audit_responses table ready")

        # ── 4. Backfill institution_category_scores from existing attempts ────
        # For each institution, use the LATEST assessment attempt to populate
        # the category scores. Subsequent assessments will overwrite these.
        rows = await conn.fetch("""
            SELECT DISTINCT ON (institution_id)
                id, institution_id, category_scores, created_at
            FROM assessment_attempts
            ORDER BY institution_id, created_at DESC
        """)

        import json
        backfill_count = 0
        for row in rows:
            cs = row["category_scores"]
            if isinstance(cs, str):
                cs = json.loads(cs)
            for category, score in cs.items():
                await conn.execute("""
                    INSERT INTO institution_category_scores
                        (institution_id, category, current_score, source_type, source_id, last_updated_at)
                    VALUES ($1::uuid, $2, $3, 'assessment', $4::uuid, $5)
                    ON CONFLICT (institution_id, category) DO UPDATE
                        SET current_score   = EXCLUDED.current_score,
                            source_type     = EXCLUDED.source_type,
                            source_id       = EXCLUDED.source_id,
                            last_updated_at = EXCLUDED.last_updated_at
                """,
                    str(row["institution_id"]),
                    category,
                    float(score),
                    str(row["id"]),
                    row["created_at"],
                )
                backfill_count += 1

        print(f"✓ Backfilled {backfill_count} category-score rows from {len(rows)} institution(s)")

        # ── 5. Create first internal_audits cycle for institutions that already
        #       have at least one assessment but no audit row yet.
        # We import action_items here to compute target_categories using the same
        # logic that will be used going forward.
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from action_items import generate_action_items
        from scoring import score_label

        existing_audits = await conn.fetch(
            "SELECT DISTINCT institution_id FROM internal_audits"
        )
        audited_institutions = {str(r["institution_id"]) for r in existing_audits}

        seeded = 0
        for row in rows:
            inst_id = str(row["institution_id"])
            if inst_id in audited_institutions:
                continue
            cs = row["category_scores"]
            if isinstance(cs, str):
                cs = json.loads(cs)
            cat_scores = {k: float(v) for k, v in cs.items()}

            target_cats = [cat for cat, score in cat_scores.items()
                           if score_label(score) != "Good"]

            first_attempt = await conn.fetchrow("""
                SELECT id, created_at FROM assessment_attempts
                WHERE institution_id = $1::uuid
                ORDER BY created_at ASC
                LIMIT 1
            """, inst_id)

            if not first_attempt:
                continue

            due_date_val = first_attempt["created_at"].date()
            import datetime
            due_date_val = due_date_val + datetime.timedelta(days=90)

            await conn.execute("""
                INSERT INTO internal_audits
                    (institution_id, sequence_number, triggered_by_type,
                     triggered_by_id, target_categories, due_date, status)
                VALUES ($1::uuid, 1, 'assessment', $2::uuid, $3::jsonb, $4, 'pending')
                ON CONFLICT (institution_id, sequence_number) DO NOTHING
            """,
                inst_id,
                str(first_attempt["id"]),
                json.dumps(target_cats),
                due_date_val,
            )
            seeded += 1

        print(f"✓ Seeded cycle-1 internal_audits rows for {seeded} institution(s)")
        print("\nMigration complete.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
