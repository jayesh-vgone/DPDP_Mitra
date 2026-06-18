CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Institutions ───────────────────────────────────────────────────────────────
-- Created before users because users.institution_id references this table.
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
