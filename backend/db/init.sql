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
    section TEXT NOT NULL,
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
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
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
CREATE TABLE IF NOT EXISTS assessment_responses (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id   UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id  UUID NOT NULL REFERENCES assessment_questions(id),
    answer_value NUMERIC NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_institution_time
    ON assessment_attempts(institution_id, created_at DESC);
