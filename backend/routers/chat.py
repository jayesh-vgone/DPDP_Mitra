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

# ── Slash-command constants ────────────────────────────────────────────────────

_CMD_ON  = frozenset({"/assessment", "/assessment on"})
_CMD_OFF = frozenset({"/exit", "/assessment off"})

_CONFIRM_ON_EN  = ("Assessment mode is on. I'll now answer using your institution's "
                   "latest compliance assessment scores. Type /exit to turn this off.")
_CONFIRM_ON_HI  = ("असेसमेंट मोड चालू है। मैं अब आपकी संस्था के नवीनतम अनुपालन "
                   "मूल्यांकन स्कोर के आधार पर उत्तर दूंगा। बंद करने के लिए /exit टाइप करें।")
_CONFIRM_OFF_EN = ("Assessment mode is off. I'll go back to answering general DPDP Act questions.")
_CONFIRM_OFF_HI = ("असेसमेंट मोड बंद है। मैं अब DPDP अधिनियम के सामान्य प्रश्नों पर वापस जाऊंगा।")
_NO_ASSESS_EN   = ("You haven't completed an assessment yet, so I don't have any scores to "
                   "reference. Complete the assessment from your dashboard first.")
_NO_ASSESS_HI   = ("आपने अभी तक कोई मूल्यांकन पूरा नहीं किया है, इसलिए मेरे पास कोई "
                   "स्कोर नहीं है। कृपया पहले अपने डैशबोर्ड से मूल्यांकन पूरा करें।")


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

    await queries.ensure_user(pool, user_id)

    trimmed = req.message.strip()

    # ── Step 1: slash-command detection (no LLM, no RAG, no injection check) ──
    lower_cmd = trimmed.lower()
    if lower_cmd in _CMD_ON or lower_cmd in _CMD_OFF:
        new_mode = lower_cmd in _CMD_ON
        if new_mode:
            confirmation = _CONFIRM_ON_HI if req.lang == "hi" else _CONFIRM_ON_EN
        else:
            confirmation = _CONFIRM_OFF_HI if req.lang == "hi" else _CONFIRM_OFF_EN

        conv_id = req.conversation_id
        if not conv_id:
            conv_id = await queries.create_conversation(pool, user_id, trimmed, req.lang)

        await queries.set_assessment_mode(pool, conv_id, new_mode)
        await queries.insert_message(pool, conv_id, "user", trimmed, "text", req.lang)
        msg_id = await queries.insert_message(pool, conv_id, "assistant", confirmation, "text", req.lang)

        return ChatResponse(
            conversation_id=conv_id,
            message=_make_message(msg_id, confirmation, conv_id, req.lang),
            audio_base64=None,
            assessment_mode=new_mode,
        )

    # ── Step 2: read current assessment_mode before any early-return paths ────
    current_mode = False
    if req.conversation_id:
        current_mode = await queries.get_assessment_mode(pool, req.conversation_id)

    # ── Layer 1: input-level injection guard ──────────────────────────────────
    injection_refusal = check_injection(trimmed, req.lang)
    if injection_refusal:
        conv_id = req.conversation_id
        if not conv_id:
            conv_id = await queries.create_conversation(pool, user_id, trimmed, req.lang)
        await queries.insert_message(pool, conv_id, "user", trimmed, "text", req.lang)
        msg_id = await queries.insert_message(pool, conv_id, "assistant", injection_refusal, "text", req.lang)
        return ChatResponse(
            conversation_id=conv_id,
            message=_make_message(msg_id, injection_refusal, conv_id, req.lang),
            audio_base64=None,
            assessment_mode=current_mode,
        )

    llm = get_llm_provider()
    tts = get_tts_provider()

    # ── History: DB is authoritative when conversation exists ─────────────────
    if req.conversation_id:
        db_history = await queries.load_history(pool, req.conversation_id)
    else:
        db_history = []

    chunks = await retrieve_chunks(trimmed)
    if chunks:
        print(f"[rag] {len(chunks)} chunks retrieved: {[c['section'] for c in chunks]}")

    # ── Assessment context: injected only when mode is explicitly ON ──────────
    # No intent classification — the mode flag is the sole gate.
    assessment_ctx = None
    if current_mode:
        user_rec = await queries.get_user_by_id(pool, user_id)
        if user_rec and user_rec.get("institution_id"):
            assessment_ctx = await queries.get_latest_assessment_for_institution(
                pool, user_rec["institution_id"]
            )

        if assessment_ctx:
            print(f"[assessment_mode] injecting context (overall={assessment_ctx['overall_score']:.0f})")
        else:
            # Mode is on but no assessment has been submitted yet.
            no_assess = _NO_ASSESS_HI if req.lang == "hi" else _NO_ASSESS_EN
            conv_id = req.conversation_id
            if not conv_id:
                conv_id = await queries.create_conversation(pool, user_id, trimmed, req.lang)
            await queries.insert_message(pool, conv_id, "user", trimmed, "text", req.lang)
            msg_id = await queries.insert_message(pool, conv_id, "assistant", no_assess, "text", req.lang)
            return ChatResponse(
                conversation_id=conv_id,
                message=_make_message(msg_id, no_assess, conv_id, req.lang),
                audio_base64=None,
                assessment_mode=True,
            )

    # ── Layer 2: hardened system prompt (anti-injection prefix in prompts.py) ─
    system_prompt = build_system_prompt(req.lang, chunks, assessment=assessment_ctx)

    reply = await llm.chat(system_prompt, db_history, trimmed)

    # ── Layer 3: output scope check ───────────────────────────────────────────
    scope_refusal = check_output_scope(trimmed, reply, req.lang)
    if scope_refusal:
        reply = scope_refusal

    tts_bytes = await tts.synthesize(reply, req.lang)
    audio_b64 = base64.b64encode(tts_bytes).decode() if tts_bytes else None

    # ── Persist conversation + messages ───────────────────────────────────────
    conv_id = req.conversation_id
    if not conv_id:
        conv_id = await queries.create_conversation(pool, user_id, trimmed, req.lang)

    await queries.insert_message(pool, conv_id, "user", trimmed, "text", req.lang)
    msg_id = await queries.insert_message(pool, conv_id, "assistant", reply, "text", req.lang)

    return ChatResponse(
        conversation_id=conv_id,
        message=_make_message(msg_id, reply, conv_id, req.lang),
        audio_base64=audio_b64,
        assessment_mode=current_mode,
    )
