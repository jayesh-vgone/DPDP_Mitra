"""
SQL helper functions for the DPDP Mitra backend.

All DB operations live here so routers stay readable and SQL is in one place.
Every function accepts a pool (or connection) as its first argument — the pool
is initialized at startup and passed in by callers rather than imported globally,
which makes these functions easier to test in isolation.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import asyncpg


# ── Institutions ───────────────────────────────────────────────────────────────

async def get_institution_by_invite_code(
    pool: asyncpg.Pool, invite_code: str
) -> Optional[dict]:
    """Return institution dict if found, None otherwise."""
    row = await pool.fetchrow(
        "SELECT * FROM institutions WHERE invite_code = $1",
        invite_code,
    )
    if row is None:
        return None
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "type": row["type"],
        "board": row["board"],
        "location": row["location"],
        "student_count": row["student_count"],
        "staff_count": row["staff_count"],
        "invite_code": row["invite_code"],
        "plan": row["plan"],
    }


async def get_institution_by_id(
    pool: asyncpg.Pool, institution_id: str
) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM institutions WHERE id = $1::uuid",
        institution_id,
    )
    if row is None:
        return None
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "type": row["type"],
        "board": row["board"],
        "location": row["location"],
        "student_count": row["student_count"],
        "staff_count": row["staff_count"],
        "invite_code": row["invite_code"],
        "plan": row["plan"],
    }


# ── Users (auth) ───────────────────────────────────────────────────────────────

async def create_user_with_password(
    pool: asyncpg.Pool,
    display_name: str,
    email: str,
    password_hash: str,
    institution_id: str,
    role: str = "admin",
) -> str:
    """
    Insert a new user row with credentials and return the new user_id string.

    The user_id is a UUID cast to TEXT so it fits the existing TEXT PRIMARY KEY.
    (Existing dev-user rows from Phase 2/4 testing are left untouched.)
    """
    user_id = str(uuid.uuid4())
    await pool.execute(
        """
        INSERT INTO users (id, display_name, email, password_hash, institution_id, role)
        VALUES ($1, $2, $3, $4, $5::uuid, $6)
        """,
        user_id,
        display_name,
        email,
        password_hash,
        institution_id,
        role,
    )
    return user_id


async def get_user_by_email(pool: asyncpg.Pool, email: str) -> Optional[dict]:
    """Return full user dict (including password_hash) for login verification."""
    row = await pool.fetchrow(
        "SELECT * FROM users WHERE email = $1",
        email,
    )
    if row is None:
        return None
    return {
        "id": row["id"],
        "display_name": row["display_name"],
        "email": row["email"],
        "password_hash": row["password_hash"],
        "institution_id": str(row["institution_id"]) if row["institution_id"] else None,
        "role": row["role"],
        "language": row["language"],
    }


async def get_user_by_id(pool: asyncpg.Pool, user_id: str) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM users WHERE id = $1",
        user_id,
    )
    if row is None:
        return None
    return {
        "id": row["id"],
        "display_name": row["display_name"],
        "email": row["email"],
        "institution_id": str(row["institution_id"]) if row["institution_id"] else None,
        "role": row["role"],
        "language": row["language"],
    }


# ── Sessions ───────────────────────────────────────────────────────────────────

SESSION_TTL_DAYS = 7


async def create_session(pool: asyncpg.Pool, user_id: str) -> str:
    """
    Create a new session row and return the session_id UUID string.

    expires_at is set to 7 days from now. On every subsequent authenticated
    request, get_session() bumps expires_at forward again — so active users
    never get logged out.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    row = await pool.fetchrow(
        """
        INSERT INTO sessions (user_id, expires_at)
        VALUES ($1, $2)
        RETURNING id
        """,
        user_id,
        expires_at,
    )
    return str(row["id"])


async def get_session(pool: asyncpg.Pool, session_id: str) -> Optional[str]:
    """
    Validate a session and return its user_id, or None if missing/expired.

    If valid, bumps expires_at forward by SESSION_TTL_DAYS (sliding expiry —
    active users stay logged in indefinitely; idle users are logged out after
    7 days of inactivity).
    """
    new_expires = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    row = await pool.fetchrow(
        """
        UPDATE sessions
        SET expires_at = $2
        WHERE id = $1::uuid
          AND expires_at > now()
        RETURNING user_id
        """,
        session_id,
        new_expires,
    )
    if row is None:
        return None
    return row["user_id"]


async def delete_session(pool: asyncpg.Pool, session_id: str) -> None:
    """Delete a session row — used by logout for instant revocation."""
    await pool.execute(
        "DELETE FROM sessions WHERE id = $1::uuid",
        session_id,
    )


# ── Users ─────────────────────────────────────────────────────────────────────

async def ensure_user(pool: asyncpg.Pool, user_id: str) -> None:
    """
    Upsert a user row.

    On first request: creates the row with default language 'en'.
    On every subsequent request: updates last_seen_at to now().
    This is the DPDP-scoped identity record — we never generate our own user IDs;
    the JWT (or dev-bypass) supplies the user_id string.
    """
    await pool.execute(
        """
        INSERT INTO users (id, last_seen_at)
        VALUES ($1, now())
        ON CONFLICT (id) DO UPDATE SET last_seen_at = now()
        """,
        user_id,
    )


# ── Conversations ─────────────────────────────────────────────────────────────

def _make_title(first_message: str) -> str:
    """Truncate first message to 40 chars to use as conversation title."""
    text = first_message.strip()
    return text if len(text) <= 40 else text[:40] + "..."


async def create_conversation(
    pool: asyncpg.Pool,
    user_id: str,
    first_message: str,
    language: str,
) -> str:
    """
    Insert a new conversation row and return its UUID as a string.

    Title is derived from the first user message (truncated to 40 chars).
    No LLM involved — simple string truncation as specified.
    """
    title = _make_title(first_message)
    row = await pool.fetchrow(
        """
        INSERT INTO conversations (user_id, title, language)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        user_id,
        title,
        language,
    )
    return str(row["id"])


async def list_conversations(pool: asyncpg.Pool, user_id: str) -> list[dict]:
    """
    Return all conversations for a user, ordered by most recent activity.

    'Most recent activity' = latest message time in that conversation,
    falling back to conversation creation time if it has no messages yet.
    The COALESCE handles empty conversations gracefully.
    """
    rows = await pool.fetch(
        """
        SELECT
            c.id,
            c.user_id,
            COALESCE(c.title, 'Untitled') AS title,
            c.language,
            c.created_at
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.user_id = $1
        GROUP BY c.id
        ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
        """,
        user_id,
    )
    return [
        {
            "id": str(r["id"]),
            "user_id": r["user_id"],
            "title": r["title"],
            "language": r["language"],
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]


# ── Messages ──────────────────────────────────────────────────────────────────

async def insert_message(
    pool: asyncpg.Pool,
    conversation_id: str,
    role: str,
    content: str,
    input_type: str,
    language: str,
) -> str:
    """Insert a single message and return its UUID as a string."""
    row = await pool.fetchrow(
        """
        INSERT INTO messages (conversation_id, role, content, input_type, language)
        VALUES ($1::uuid, $2, $3, $4, $5)
        RETURNING id
        """,
        conversation_id,
        role,
        content,
        input_type,
        language,
    )
    return str(row["id"])


async def load_history(
    pool: asyncpg.Pool,
    conversation_id: str,
    limit: int = 20,
) -> list[dict]:
    """
    Load the last `limit` messages from a conversation, returned oldest-first.

    Used to build the LLM context window — we want chronological order so the
    model sees the conversation in the right sequence.
    The inner ORDER BY DESC + outer ORDER BY ASC is the standard 'last N rows
    in chronological order' pattern.
    """
    rows = await pool.fetch(
        """
        SELECT role, content
        FROM (
            SELECT role, content, created_at
            FROM messages
            WHERE conversation_id = $1::uuid
            ORDER BY created_at DESC
            LIMIT $2
        ) recent
        ORDER BY created_at ASC
        """,
        conversation_id,
        limit,
    )
    return [{"role": r["role"], "content": r["content"]} for r in rows]


async def list_messages(pool: asyncpg.Pool, conversation_id: str) -> list[dict]:
    """
    Return the full message history for one conversation, ordered chronologically.

    Used by GET /conversations/{id}/messages — the frontend renders them top-to-bottom.
    """
    rows = await pool.fetch(
        """
        SELECT id, conversation_id, role, content, input_type, language, created_at
        FROM messages
        WHERE conversation_id = $1::uuid
        ORDER BY created_at ASC
        """,
        conversation_id,
    )
    return [
        {
            "id": str(r["id"]),
            "conversation_id": str(r["conversation_id"]),
            "role": r["role"],
            "content": r["content"],
            "input_type": r["input_type"],
            "language": r["language"],
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]
