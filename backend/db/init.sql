CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Institutions ───────────────────────────────────────────────────────────────
-- Created before users because users.institution_id references this table.
-- category determines which question set the institution answers in assessments.
-- type is a free-text display field (unchanged); category is the constrained field.
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
    category        TEXT NOT NULL DEFAULT 'school'
                        CHECK (category IN ('school', 'higher_ed', 'edtech')),
    -- institution_subtype + per-field verification flags (admin-verified identity).
    -- Included here so a fresh DB built from init.sql alone is complete; the
    -- migrate_institution_details.py script remains for upgrading existing DBs.
    institution_subtype          TEXT,
    student_count_verified       BOOLEAN NOT NULL DEFAULT false,
    staff_count_verified         BOOLEAN NOT NULL DEFAULT false,
    institution_subtype_verified BOOLEAN NOT NULL DEFAULT false,
    location_verified            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── Users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    display_name    TEXT,
    email           TEXT UNIQUE,
    password_hash   TEXT,
    institution_id  UUID REFERENCES institutions(id),
    role            TEXT NOT NULL DEFAULT 'admin',
    language        TEXT NOT NULL DEFAULT 'en',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── Sessions ───────────────────────────────────────────────────────────────────
-- Cookie holds only the opaque session id (UUID); actual session state lives here.
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     TEXT NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    assessment_mode BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    input_type TEXT NOT NULL DEFAULT 'text' CHECK (input_type IN ('text', 'voice')),
    language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dpdp_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section TEXT,
    content TEXT NOT NULL,
    embedding vector(1024) NOT NULL
);

-- ── Assessment ─────────────────────────────────────────────────────────────────

-- One row per question. institution_category determines which set a user sees.
-- category is one of 8 DPDP risk categories. order_index controls display order.
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
    -- is_active lets the admin panel deactivate a question (hide from new
    -- assessments) without deleting it — historical answers keep their FK.
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One row per full submission. Stores denormalized scores so history is a
-- trivial SELECT — no re-computation needed.
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id       UUID NOT NULL REFERENCES institutions(id),
    submitted_by_user_id TEXT REFERENCES users(id),
    overall_score        NUMERIC NOT NULL,
    category_scores      JSONB NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One row per answer inside an attempt. Linked to attempt_id, NOT institution_id,
-- so answers from different submissions stay separated.
-- question_text/dpdp_section/weight/answer_type are a SNAPSHOT taken at submission
-- time: once an admin edits a question, past attempts must NOT change. The score
-- is already frozen in assessment_attempts; these columns freeze the drill-down
-- display source too.
CREATE TABLE IF NOT EXISTS assessment_responses (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id    UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id   UUID NOT NULL REFERENCES assessment_questions(id),
    answer_value  NUMERIC NOT NULL,
    question_text TEXT,
    dpdp_section  TEXT,
    weight        NUMERIC,
    answer_type   TEXT,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_institution_time
    ON assessment_attempts(institution_id, created_at DESC);

-- ── Action Queue (remediation tracker) ───────────────────────────────────────────
-- Hybrid model: auto-generated items (is_custom=false) are deterministically
-- regenerated on every assessment submission (DELETE-then-INSERT for the institution's
-- non-custom rows); custom items (is_custom=true) are user-added and NEVER touched by
-- regeneration. Both kinds are fully user-editable (text, category, effort, priority,
-- status) and deletable. KNOWN TRADEOFF (v1): an in_progress auto item is wiped on the
-- next submission like any other auto item — in-progress tracking is lost on resubmit.
CREATE TABLE IF NOT EXISTS action_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id),
    category        TEXT NOT NULL,
    task_text       TEXT NOT NULL,
    priority        TEXT NOT NULL,        -- 'P1'..'P6'
    priority_level  TEXT NOT NULL,        -- 'HIGH' | 'MED' (badge, derived from score band)
    effort_estimate TEXT,                 -- e.g. "2-3 wks" — free text
    status          TEXT NOT NULL DEFAULT 'not_started'
                        CHECK (status IN ('not_started', 'in_progress', 'done')),
    is_custom       BOOLEAN NOT NULL DEFAULT false,  -- true = user-added, survives regeneration
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_items_institution
    ON action_items(institution_id, priority);

-- ── Admin panel (separate auth realm from institution users) ────────────────────
-- admin_users are provisioned manually (seed_admin.py); no public signup.
-- admin_sessions mirror `sessions` but with a distinct cookie so an institution
-- user and an admin can be logged in at the same time in one browser.
CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
