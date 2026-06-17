import base64
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from schemas.voice import VoiceRequest, VoiceResponse
from schemas.chat import MessageOut
from providers.llm.factory import get_llm_provider
from providers.stt.factory import get_stt_provider
from providers.tts.factory import get_tts_provider
from prompts import build_system_prompt
from retrieval import retrieve_chunks
from guardrails import check_injection, check_output_scope
from db.pool import get_pool
from db import queries

router = APIRouter()


def _make_message(msg_id: str, content: str, conv_id: str, lang: str, input_type: str = "voice") -> MessageOut:
    return MessageOut(
        id=msg_id,
        conversation_id=conv_id,
        role="assistant",
        content=content,
        input_type=input_type,
        language=lang,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/voice", response_model=VoiceResponse)
async def voice(req: VoiceRequest, request: Request):
    user_id: str = request.state.user_id
    pool = get_pool()

    await queries.ensure_user(pool, user_id)

    stt = get_stt_provider()
    llm = get_llm_provider()
    tts = get_tts_provider()

    audio_bytes = base64.b64decode(req.audio_base64)
    transcript = await stt.transcribe(audio_bytes, req.audio_format, req.lang)

    # ── Layer 1: input-level injection guard (on the transcript) ─────────────
    injection_refusal = check_injection(transcript, req.lang)
    if injection_refusal:
        conv_id = req.conversation_id
        if not conv_id:
            conv_id = await queries.create_conversation(pool, user_id, transcript, req.lang)
        await queries.insert_message(pool, conv_id, "user", transcript, "voice", req.lang)
        msg_id = await queries.insert_message(pool, conv_id, "assistant", injection_refusal, "text", req.lang)

        tts_bytes = await tts.synthesize(injection_refusal, req.lang)
        audio_b64 = base64.b64encode(tts_bytes).decode() if tts_bytes else None
        return VoiceResponse(
            conversation_id=conv_id,
            transcript=transcript,
            message=_make_message(msg_id, injection_refusal, conv_id, req.lang),
            audio_base64=audio_b64,
        )

    # ── History: DB is authoritative when conversation exists ─────────────────
    if req.conversation_id:
        db_history = await queries.load_history(pool, req.conversation_id)
    else:
        db_history = []

    chunks = await retrieve_chunks(transcript)
    if chunks:
        print(f"[rag] {len(chunks)} chunks retrieved: {[c['section'] for c in chunks]}")

    # ── Layer 2: hardened system prompt (anti-injection prefix in prompts.py) ─
    system_prompt = build_system_prompt(req.lang, chunks)

    reply = await llm.chat(system_prompt, db_history, transcript)

    # ── Layer 3: output scope check ───────────────────────────────────────────
    scope_refusal = check_output_scope(transcript, reply, req.lang)
    if scope_refusal:
        reply = scope_refusal

    tts_bytes = await tts.synthesize(reply, req.lang)
    audio_b64 = base64.b64encode(tts_bytes).decode() if tts_bytes else None

    # ── Persist conversation + messages ───────────────────────────────────────
    conv_id = req.conversation_id
    if not conv_id:
        conv_id = await queries.create_conversation(pool, user_id, transcript, req.lang)

    # input_type = "voice" for the user message, "text" for the assistant reply
    await queries.insert_message(pool, conv_id, "user", transcript, "voice", req.lang)
    msg_id = await queries.insert_message(pool, conv_id, "assistant", reply, "text", req.lang)

    return VoiceResponse(
        conversation_id=conv_id,
        transcript=transcript,
        message=_make_message(msg_id, reply, conv_id, req.lang),
        audio_base64=audio_b64,
    )
