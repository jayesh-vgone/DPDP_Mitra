import base64
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from schemas.chat import ChatRequest, ChatResponse, MessageOut
from providers.llm.factory import get_llm_provider
from providers.tts.factory import get_tts_provider
from prompts import build_system_prompt
from retrieval import retrieve_chunks
from guardrails import check_injection, check_output_scope
from db.pool import get_pool
from db import queries
from middleware.session import get_session_user

router = APIRouter()


def _make_message(msg_id: str, content: str, conv_id: str, lang: str, input_type: str = "text") -> MessageOut:
    return MessageOut(
        id=msg_id,
        conversation_id=conv_id,
        role="assistant",
        content=content,
        input_type=input_type,
        language=lang,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, user_id: str = Depends(get_session_user)):
    pool = get_pool()

    # Upsert the user row so every authenticated caller has a users record.
    # On first ever request this creates the row; on subsequent requests it
    # just bumps last_seen_at — the INSERT ... ON CONFLICT makes it idempotent.
    await queries.ensure_user(pool, user_id)

    # ── Layer 1: input-level injection guard ─────────────────────────────────
    injection_refusal = check_injection(req.message, req.lang)
    if injection_refusal:
        # For injection refusals we still need a conversation to attach to.
        # If none provided, create one so the response can be persisted.
        conv_id = req.conversation_id
        if not conv_id:
            conv_id = await queries.create_conversation(pool, user_id, req.message, req.lang)
        await queries.insert_message(pool, conv_id, "user", req.message, "text", req.lang)
        msg_id = await queries.insert_message(pool, conv_id, "assistant", injection_refusal, "text", req.lang)
        return ChatResponse(
            conversation_id=conv_id,
            message=_make_message(msg_id, injection_refusal, conv_id, req.lang),
            audio_base64=None,
        )

    llm = get_llm_provider()
    tts = get_tts_provider()

    # ── History: DB is authoritative when conversation exists ─────────────────
    # If the client passes a conversation_id it means we're continuing a session.
    # We load the real history from the DB rather than trusting the client-sent
    # array — this makes context survive page refreshes.
    # For new conversations, history starts empty (client-sent array ignored).
    if req.conversation_id:
        db_history = await queries.load_history(pool, req.conversation_id)
    else:
        db_history = []

    chunks = await retrieve_chunks(req.message)
    if chunks:
        print(f"[rag] {len(chunks)} chunks retrieved: {[c['section'] for c in chunks]}")

    # ── Layer 2: hardened system prompt (anti-injection prefix in prompts.py) ─
    system_prompt = build_system_prompt(req.lang, chunks)

    reply = await llm.chat(system_prompt, db_history, req.message)

    # ── Layer 3: output scope check ───────────────────────────────────────────
    scope_refusal = check_output_scope(req.message, reply, req.lang)
    if scope_refusal:
        reply = scope_refusal

    tts_bytes = await tts.synthesize(reply, req.lang)
    audio_b64 = base64.b64encode(tts_bytes).decode() if tts_bytes else None

    # ── Persist conversation + messages ───────────────────────────────────────
    # Create the conversation row on the first message in this chat.
    # Doing it after the LLM call means the title comes from a message we know
    # is valid (passed the injection guard), not a fabricated first turn.
    conv_id = req.conversation_id
    if not conv_id:
        conv_id = await queries.create_conversation(pool, user_id, req.message, req.lang)

    await queries.insert_message(pool, conv_id, "user", req.message, "text", req.lang)
    msg_id = await queries.insert_message(pool, conv_id, "assistant", reply, "text", req.lang)

    return ChatResponse(
        conversation_id=conv_id,
        message=_make_message(msg_id, reply, conv_id, req.lang),
        audio_base64=audio_b64,
    )
