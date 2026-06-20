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

def _institution_row_to_dict(row) -> dict:
    """Convert an asyncpg institution row to a plain dict."""
    keys = set(row.keys())
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
        # category added in Phase 6a
        "category": row["category"] if "category" in keys else "school",
        # institution_subtype + verification flags added post-Phase 8
        "institution_subtype": row["institution_subtype"] if "institution_subtype" in keys else None,
        "student_count_verified": bool(row["student_count_verified"]) if "student_count_verified" in keys else False,
        "staff_count_verified": bool(row["staff_count_verified"]) if "staff_count_verified" in keys else False,
        "institution_subtype_verified": bool(row["institution_subtype_verified"]) if "institution_subtype_verified" in keys else False,
        "location_verified": bool(row["location_verified"]) if "location_verified" in keys else False,
    }


async def get_institution_by_invite_code(
    pool: asyncpg.Pool, invite_code: str
) -> Optional[dict]:
    """Return institution dict if found, None otherwise."""
    row = await pool.fetchrow(
        "SELECT * FROM institutions WHERE invite_code = $1",
        invite_code,
    )
    return None if row is None else _institution_row_to_dict(row)


async def get_institution_by_id(
    pool: asyncpg.Pool, institution_id: str
) -> Optional[dict]:
    row = await pool.fetchrow(
        "SELECT * FROM institutions WHERE id = $1::uuid",
        institution_id,
    )
    return None if row is None else _institution_row_to_dict(row)


async def update_institution_fields(
    pool: asyncpg.Pool,
    institution_id: str,
    updates: dict,
) -> None:
    """
    Apply a partial update to an institutions row. `updates` maps column name to
    new value — only those columns are changed. Caller is responsible for
    per-field change-detection (compare old vs. new before calling this).
    Builds a parameterised UPDATE so column names never come from untrusted input.
    """
    if not updates:
        return
    cols = list(updates.keys())
    vals = [updates[c] for c in cols]
    set_clause = ", ".join(f"{c} = ${i + 1}" for i, c in enumerate(cols))
    vals.append(institution_id)
    await pool.execute(
        f"UPDATE institutions SET {set_clause} WHERE id = ${len(vals)}::uuid",
        *vals,
    )


async def admin_list_institutions(
    pool: asyncpg.Pool, search: Optional[str] = None
) -> list[dict]:
    """
    Return all institutions with their four editable fields + verification flags.
    Optionally filter by name (case-insensitive substring match).
    pending_count (computed here) is the number of non-null fields that are unverified.
    """
    if search:
        rows = await pool.fetch(
            """
            SELECT id, name, category,
                   location, student_count, staff_count, institution_subtype,
                   location_verified, student_count_verified,
                   staff_count_verified, institution_subtype_verified
            FROM institutions
            WHERE LOWER(name) LIKE $1
            ORDER BY name
            """,
            f"%{search.lower()}%",
        )
    else:
        rows = await pool.fetch(
            """
            SELECT id, name, category,
                   location, student_count, staff_count, institution_subtype,
                   location_verified, student_count_verified,
                   staff_count_verified, institution_subtype_verified
            FROM institutions
            ORDER BY name
            """
        )

    result = []
    for row in rows:
        pending = 0
        if row["location"] is not None and not row["location_verified"]:
            pending += 1
        if row["student_count"] is not None and not row["student_count_verified"]:
            pending += 1
        if row["staff_count"] is not None and not row["staff_count_verified"]:
            pending += 1
        if row["institution_subtype"] is not None and not row["institution_subtype_verified"]:
            pending += 1
        result.append({
            "id": str(row["id"]),
            "name": row["name"],
            "category": row["category"],
            "location": row["location"],
            "student_count": row["student_count"],
            "staff_count": row["staff_count"],
            "institution_subtype": row["institution_subtype"],
            "location_verified": bool(row["location_verified"]),
            "student_count_verified": bool(row["student_count_verified"]),
            "staff_count_verified": bool(row["staff_count_verified"]),
            "institution_subtype_verified": bool(row["institution_subtype_verified"]),
            "pending_count": pending,
        })
    return result


async def admin_verify_institution_field(
    pool: asyncpg.Pool,
    institution_id: str,
    field: str,
) -> Optional[str]:
    """
    Set the *_verified flag for one institution field to true.
    Returns an error string if the field value is currently null (nothing to verify).
    Returns None on success.
    `field` must be one of: location, student_count, staff_count, institution_subtype.
    Caller must validate `field` against VERIFIABLE_INSTITUTION_FIELDS before calling.
    """
    try:
        row = await pool.fetchrow(
            f"SELECT {field} FROM institutions WHERE id = $1::uuid",
            institution_id,
        )
    except asyncpg.DataError:
        return "Institution not found"
    if row is None:
        return "Institution not found"
    if row[field] is None:
        return f"Cannot verify: {field} has no value set"

    verified_col = f"{field}_verified"
    await pool.execute(
        f"UPDATE institutions SET {verified_col} = true WHERE id = $1::uuid",
        institution_id,
    )
    return None


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


async def get_user_password_hash(pool: asyncpg.Pool, user_id: str) -> Optional[str]:
    """Return only the stored password_hash for bcrypt verification. Never exposed via API."""
    row = await pool.fetchrow(
        "SELECT password_hash FROM users WHERE id = $1",
        user_id,
    )
    return row["password_hash"] if row else None


async def update_user_profile(
    pool: asyncpg.Pool,
    user_id: str,
    name: Optional[str] = None,
    email: Optional[str] = None,
) -> None:
    """Update display_name and/or email for a user. Only fields provided are changed."""
    if name is not None:
        await pool.execute(
            "UPDATE users SET display_name = $1 WHERE id = $2",
            name, user_id,
        )
    if email is not None:
        await pool.execute(
            "UPDATE users SET email = $1 WHERE id = $2",
            email, user_id,
        )


async def update_user_password(pool: asyncpg.Pool, user_id: str, new_hash: str) -> None:
    """Replace the stored password_hash. Caller is responsible for hashing."""
    await pool.execute(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        new_hash, user_id,
    )


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
    Returns None (not 500) if session_id is not a valid UUID format.
    """
    new_expires = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    try:
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
    except asyncpg.DataError:
        # session_id is not a valid UUID — treat as invalid session
        return None
    if row is None:
        return None
    return row["user_id"]


async def delete_session(pool: asyncpg.Pool, session_id: str) -> None:
    """Delete a session row — used by logout for instant revocation."""
    try:
        await pool.execute(
            "DELETE FROM sessions WHERE id = $1::uuid",
            session_id,
        )
    except asyncpg.DataError:
        pass  # malformed cookie — nothing to delete


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
            c.assessment_mode,
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
            "assessment_mode": bool(r["assessment_mode"]),
            "created_at": r["created_at"].isoformat(),
        }
        for r in rows
    ]


async def get_assessment_mode(pool: asyncpg.Pool, conversation_id: str) -> bool:
    """Return the current assessment_mode flag for a conversation (default False)."""
    row = await pool.fetchrow(
        "SELECT assessment_mode FROM conversations WHERE id = $1::uuid",
        conversation_id,
    )
    return bool(row["assessment_mode"]) if row else False


async def set_assessment_mode(pool: asyncpg.Pool, conversation_id: str, mode: bool) -> None:
    """Persist the assessment_mode toggle for a conversation."""
    await pool.execute(
        "UPDATE conversations SET assessment_mode = $1 WHERE id = $2::uuid",
        mode,
        conversation_id,
    )


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


# ── Assessment ─────────────────────────────────────────────────────────────────


async def get_questions_for_category(
    pool: asyncpg.Pool, institution_category: str
) -> list[dict]:
    """
    Return all questions for a given institution category, ordered by order_index.

    The router fetches the institution's category first, then calls this function.
    Filtering by category happens here — scoring.py has no awareness of categories.
    """
    rows = await pool.fetch(
        """
        SELECT id, institution_category, category, question_text,
               dpdp_section, weight, order_index, answer_type
        FROM assessment_questions
        WHERE institution_category = $1
          AND is_active = true
        ORDER BY order_index ASC
        """,
        institution_category,
    )
    return [
        {
            "id": str(r["id"]),
            "institution_category": r["institution_category"],
            "category": r["category"],
            "question_text": r["question_text"],
            "dpdp_section": r["dpdp_section"],
            "weight": float(r["weight"]),
            "order_index": r["order_index"],
            "answer_type": r["answer_type"],
        }
        for r in rows
    ]


async def get_question_map(
    pool: asyncpg.Pool, institution_category: str
) -> dict[str, dict]:
    """
    Return a dict keyed by question UUID for quick look-ups during submission.

    Values include weight and category so the router can build the ResponseItem
    list for scoring.py without a per-question DB round-trip.
    """
    questions = await get_questions_for_category(pool, institution_category)
    return {q["id"]: q for q in questions}


async def create_assessment_attempt(
    pool: asyncpg.Pool,
    institution_id: str,
    user_id: str,
    overall_score: float,
    category_scores: dict,
) -> str:
    """
    Insert one assessment_attempts row and return its UUID string.

    overall_score and category_scores are stored denormalized so history queries
    need no re-computation.
    """
    import json
    row = await pool.fetchrow(
        """
        INSERT INTO assessment_attempts
            (institution_id, submitted_by_user_id, overall_score, category_scores)
        VALUES ($1::uuid, $2, $3, $4::jsonb)
        RETURNING id
        """,
        institution_id,
        user_id,
        overall_score,
        json.dumps(category_scores),
    )
    return str(row["id"])


async def create_assessment_responses(
    pool: asyncpg.Pool,
    attempt_id: str,
    responses: list[dict],
    # [{question_id, answer_value, question_text, dpdp_section, weight, answer_type}, ...]
) -> None:
    """
    Bulk-insert one assessment_responses row per answer, all linked to attempt_id.

    question_text/dpdp_section/weight/answer_type are SNAPSHOTTED here from the
    question as it exists at submission time. This is what makes past attempts
    immune to later admin edits — the drill-down reads these frozen values, never
    the live assessment_questions row.

    Using executemany avoids N round-trips for large question sets.
    """
    await pool.executemany(
        """
        INSERT INTO assessment_responses
            (attempt_id, question_id, answer_value,
             question_text, dpdp_section, weight, answer_type)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
        """,
        [
            (
                attempt_id,
                r["question_id"],
                r["answer_value"],
                r.get("question_text"),
                r.get("dpdp_section"),
                r.get("weight"),
                r.get("answer_type"),
            )
            for r in responses
        ],
    )


def _attempt_to_dict(row) -> dict:
    import json as _json
    cs = row["category_scores"]
    # asyncpg returns JSONB as a raw JSON string — parse it manually.
    if isinstance(cs, str):
        cs = _json.loads(cs)
    return {
        "id": str(row["id"]),
        "institution_id": str(row["institution_id"]),
        "submitted_by_user_id": row["submitted_by_user_id"],
        "overall_score": float(row["overall_score"]),
        "category_scores": {k: float(v) for k, v in cs.items()},
        "created_at": row["created_at"].isoformat(),
    }


async def get_category_detail_for_attempt(
    pool: asyncpg.Pool,
    attempt_id: str,
    category: str,
) -> list[dict]:
    """
    Return per-question detail for one category within a specific attempt.

    Reads the per-response SNAPSHOT (question_text/dpdp_section/weight/answer_type
    frozen at submission time) so historical attempts are unaffected by later
    admin edits. COALESCE falls back to the live question row only if a snapshot
    value is NULL (defensive — all rows are backfilled, new rows always snapshot).
    The join is also how we resolve the risk category (which is never edited).
    """
    rows = await pool.fetch(
        """
        SELECT
            COALESCE(r.question_text, q.question_text) AS question_text,
            COALESCE(r.dpdp_section,  q.dpdp_section)  AS dpdp_section,
            COALESCE(r.weight,        q.weight)        AS weight,
            COALESCE(r.answer_type,   q.answer_type)   AS answer_type,
            r.answer_value
        FROM assessment_responses r
        JOIN assessment_questions q ON q.id = r.question_id
        WHERE r.attempt_id = $1::uuid
          AND q.category    = $2
        ORDER BY q.order_index ASC
        """,
        attempt_id,
        category,
    )
    return [
        {
            "question_text": row["question_text"],
            "dpdp_section":  row["dpdp_section"],
            "weight":        float(row["weight"]),
            "answer_type":   row["answer_type"],
            "answer_value":  float(row["answer_value"]),
        }
        for row in rows
    ]


async def get_attempt_by_id(
    pool: asyncpg.Pool,
    attempt_id: str,
    institution_id: str,
) -> dict | None:
    """
    Fetch a single attempt row, scoped to the institution.

    Returns None if not found or if attempt belongs to a different institution
    (prevents one institution from viewing another's data).
    """
    row = await pool.fetchrow(
        """
        SELECT id, institution_id, submitted_by_user_id,
               overall_score, category_scores, created_at
        FROM assessment_attempts
        WHERE id             = $1::uuid
          AND institution_id = $2::uuid
        """,
        attempt_id,
        institution_id,
    )
    return None if row is None else _attempt_to_dict(row)


async def get_latest_assessment_for_institution(
    pool: asyncpg.Pool,
    institution_id: str,
) -> dict | None:
    """
    Return the most recent assessment attempt for an institution, or None.

    Used by the chat pipeline to inject score context when the user asks
    about their compliance status.
    """
    row = await pool.fetchrow(
        """
        SELECT id, institution_id, submitted_by_user_id,
               overall_score, category_scores, created_at
        FROM assessment_attempts
        WHERE institution_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT 1
        """,
        institution_id,
    )
    return None if row is None else _attempt_to_dict(row)


async def get_assessment_scores(
    pool: asyncpg.Pool, institution_id: str
) -> dict:
    """
    Return the latest attempt + full history for an institution.

    The idx_attempts_institution_time index makes both lookups fast.
    Returns {"latest": {...}|null, "history": [...]} — null latest means
    no assessment has been submitted yet.
    """
    rows = await pool.fetch(
        """
        SELECT id, institution_id, submitted_by_user_id,
               overall_score, category_scores, created_at
        FROM assessment_attempts
        WHERE institution_id = $1::uuid
        ORDER BY created_at DESC
        """,
        institution_id,
    )
    if not rows:
        return {"latest": None, "history": []}

    history = [_attempt_to_dict(r) for r in rows]
    return {"latest": history[0], "history": history}


# ── Admin users & sessions (separate realm from institution auth) ────────────────

ADMIN_SESSION_TTL_DAYS = 7


async def create_admin_user(pool: asyncpg.Pool, email: str, password_hash: str) -> str:
    """Insert an admin_users row and return its UUID string."""
    row = await pool.fetchrow(
        "INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING id",
        email,
        password_hash,
    )
    return str(row["id"])


async def get_admin_by_email(pool: asyncpg.Pool, email: str) -> Optional[dict]:
    """Return admin dict INCLUDING password_hash — for login verification only."""
    row = await pool.fetchrow("SELECT * FROM admin_users WHERE email = $1", email)
    if row is None:
        return None
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "password_hash": row["password_hash"],
    }


async def get_admin_by_id(pool: asyncpg.Pool, admin_id: str) -> Optional[dict]:
    """Return admin dict WITHOUT password_hash — safe for API responses."""
    try:
        row = await pool.fetchrow(
            "SELECT id, email FROM admin_users WHERE id = $1::uuid", admin_id
        )
    except asyncpg.DataError:
        return None
    if row is None:
        return None
    return {"id": str(row["id"]), "email": row["email"]}


async def create_admin_session(pool: asyncpg.Pool, admin_id: str) -> str:
    """Create an admin_sessions row (7-day expiry) and return its UUID string."""
    expires_at = datetime.now(timezone.utc) + timedelta(days=ADMIN_SESSION_TTL_DAYS)
    row = await pool.fetchrow(
        "INSERT INTO admin_sessions (admin_id, expires_at) VALUES ($1::uuid, $2) RETURNING id",
        admin_id,
        expires_at,
    )
    return str(row["id"])


async def get_admin_session(pool: asyncpg.Pool, session_id: str) -> Optional[str]:
    """
    Validate an admin session and return its admin_id, or None if missing/expired.
    Sliding expiry like institution sessions. Guards against non-UUID cookies.
    """
    new_expires = datetime.now(timezone.utc) + timedelta(days=ADMIN_SESSION_TTL_DAYS)
    try:
        row = await pool.fetchrow(
            """
            UPDATE admin_sessions
            SET expires_at = $2
            WHERE id = $1::uuid
              AND expires_at > now()
            RETURNING admin_id
            """,
            session_id,
            new_expires,
        )
    except asyncpg.DataError:
        return None
    if row is None:
        return None
    return str(row["admin_id"])


async def delete_admin_session(pool: asyncpg.Pool, session_id: str) -> None:
    """Delete an admin session row — used by admin logout."""
    try:
        await pool.execute("DELETE FROM admin_sessions WHERE id = $1::uuid", session_id)
    except asyncpg.DataError:
        pass


# ── Admin: question bank CRUD ────────────────────────────────────────────────────

def _admin_question_to_dict(row) -> dict:
    return {
        "id": str(row["id"]),
        "institution_category": row["institution_category"],
        "category": row["category"],
        "question_text": row["question_text"],
        "dpdp_section": row["dpdp_section"],
        "weight": float(row["weight"]),
        "order_index": row["order_index"],
        "answer_type": row["answer_type"],
        "is_active": bool(row["is_active"]),
    }


async def admin_list_questions(
    pool: asyncpg.Pool, institution_category: str
) -> list[dict]:
    """
    Return ALL questions (active AND inactive) for one institution_category,
    ordered by category then order_index. Admin-only — the institution-facing
    fetch filters is_active; this one shows everything so admins can re-activate.
    """
    rows = await pool.fetch(
        """
        SELECT id, institution_category, category, question_text,
               dpdp_section, weight, order_index, answer_type, is_active
        FROM assessment_questions
        WHERE institution_category = $1
        ORDER BY category ASC, order_index ASC
        """,
        institution_category,
    )
    return [_admin_question_to_dict(r) for r in rows]


async def get_question_by_id(pool: asyncpg.Pool, question_id: str) -> Optional[dict]:
    try:
        row = await pool.fetchrow(
            """
            SELECT id, institution_category, category, question_text,
                   dpdp_section, weight, order_index, answer_type, is_active
            FROM assessment_questions WHERE id = $1::uuid
            """,
            question_id,
        )
    except asyncpg.DataError:
        return None
    return None if row is None else _admin_question_to_dict(row)


async def admin_update_question(
    pool: asyncpg.Pool,
    question_id: str,
    question_text: Optional[str] = None,
    dpdp_section: Optional[str] = None,
    weight: Optional[float] = None,
    answer_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Optional[dict]:
    """
    Update editable fields of one question. Only non-None args are applied
    (merge-then-write so None means "leave unchanged" even for the boolean
    is_active). The risk `category` is intentionally NOT editable. Bumps updated_at.
    Returns the updated row, or None if the question doesn't exist.
    """
    current = await get_question_by_id(pool, question_id)
    if current is None:
        return None

    new_text    = current["question_text"] if question_text is None else question_text
    new_section = current["dpdp_section"]  if dpdp_section  is None else dpdp_section
    new_weight  = current["weight"]        if weight        is None else weight
    new_atype   = current["answer_type"]   if answer_type   is None else answer_type
    new_active  = current["is_active"]     if is_active     is None else is_active

    row = await pool.fetchrow(
        """
        UPDATE assessment_questions
        SET question_text = $2,
            dpdp_section  = $3,
            weight        = $4,
            answer_type   = $5,
            is_active     = $6,
            updated_at    = now()
        WHERE id = $1::uuid
        RETURNING id, institution_category, category, question_text,
                  dpdp_section, weight, order_index, answer_type, is_active
        """,
        question_id, new_text, new_section, new_weight, new_atype, new_active,
    )
    return None if row is None else _admin_question_to_dict(row)


async def admin_create_question(
    pool: asyncpg.Pool,
    institution_category: str,
    category: str,
    question_text: str,
    dpdp_section: Optional[str],
    weight: float,
    answer_type: str,
) -> dict:
    """
    Insert a new question. order_index is assigned as (max order_index for that
    institution_category) + 1 so it appends after existing questions.
    """
    next_idx = await pool.fetchval(
        """
        SELECT COALESCE(MAX(order_index), -1) + 1
        FROM assessment_questions
        WHERE institution_category = $1
        """,
        institution_category,
    )
    row = await pool.fetchrow(
        """
        INSERT INTO assessment_questions
            (institution_category, category, question_text, dpdp_section,
             weight, order_index, answer_type, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id, institution_category, category, question_text,
                  dpdp_section, weight, order_index, answer_type, is_active
        """,
        institution_category, category, question_text, dpdp_section,
        weight, next_idx, answer_type,
    )
    return _admin_question_to_dict(row)
