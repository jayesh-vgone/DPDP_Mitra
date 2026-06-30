"""
Internal Audit router.

90-day recurring lightweight retest. Only asks questions for categories that
scored poorly (≤70) at the time the audit cycle was triggered. Uses the same
risk-band logic as Action Queue generation (score_label() from scoring.py).

Endpoints:
  GET  /internal-audit/status   — current cycle status, is_due, days_overdue
  POST /internal-audit/start    — begin the audit (only when is_due=True)
  POST /internal-audit/submit   — submit responses, update scores, spawn next cycle
  GET  /internal-audit/history  — past completed cycles

All endpoints use the existing session-based auth middleware via get_session_user.
"""

from __future__ import annotations

import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from db.pool import get_pool
from db import queries
from middleware.session import get_session_user
from schemas.internal_audit import (
    InternalAuditStatus,
    StartResponse,
    AuditSubmitRequest,
    AuditSubmitResponse,
    AuditHistoryItem,
)
from schemas.assessment import QuestionOut
from scoring import compute_scores, score_label, ResponseItem, RISK_CATEGORIES
from action_items import generate_action_items

router = APIRouter(prefix="/internal-audit", tags=["internal-audit"])

AUDIT_CADENCE_DAYS = 90


async def _resolve_institution(user_id: str) -> dict:
    pool = get_pool()
    user = await queries.get_user_by_id(pool, user_id)
    if not user or not user.get("institution_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no associated institution",
        )
    institution = await queries.get_institution_by_id(pool, user["institution_id"])
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution not found",
        )
    return institution


def _compute_days_overdue(due_date: datetime.date) -> int:
    today = datetime.date.today()
    return max(0, (today - due_date).days)


def _is_due(due_date: datetime.date) -> bool:
    return datetime.date.today() >= due_date


@router.get("/status", response_model=InternalAuditStatus)
async def get_status(user_id: str = Depends(get_session_user)):
    """
    Return the current internal audit cycle status for the institution.

    States:
      not_applicable  — no completed assessment exists yet
      pending         — cycle exists (compute is_due from due_date)
      in_progress     — audit started, awaiting submission
      completed       — (shouldn't return this; the completed row triggers cycle N+1 immediately)
    """
    institution = await _resolve_institution(user_id)
    pool = get_pool()

    # Check whether any assessment has been completed.
    current_scores = await queries.get_institution_current_scores(pool, institution["id"])
    if current_scores is None:
        return InternalAuditStatus(status="not_applicable")

    current_audit = await queries.get_current_internal_audit(pool, institution["id"])
    if current_audit is None:
        # All cycles are completed but a new one wasn't created (shouldn't happen
        # after the first submit), treat as not_applicable defensively.
        return InternalAuditStatus(status="not_applicable")

    due_date = current_audit["due_date"]
    audit_status = current_audit["status"]
    is_due_now = _is_due(due_date)
    days_over = _compute_days_overdue(due_date)
    can_start = is_due_now and audit_status == "pending"

    return InternalAuditStatus(
        status=audit_status,
        sequence_number=current_audit["sequence_number"],
        due_date=due_date,
        is_due=is_due_now,
        days_overdue=days_over,
        can_start=can_start,
        target_categories=current_audit["target_categories"],
    )


@router.post("/start", response_model=StartResponse, status_code=200)
async def start_audit(user_id: str = Depends(get_session_user)):
    """
    Start the current audit cycle.

    Only succeeds when is_due=True and status=pending.
    Transitions status to in_progress and returns the filtered question set.
    """
    institution = await _resolve_institution(user_id)
    pool = get_pool()

    current_audit = await queries.get_current_internal_audit(pool, institution["id"])
    if current_audit is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending internal audit cycle found. Complete your first assessment to begin.",
        )

    if current_audit["status"] == "in_progress":
        # Already started — return the question set again (resume support)
        target_categories = current_audit["target_categories"]
        questions_raw = await queries.get_questions_for_categories(
            pool, institution["id"], institution["category"], target_categories
        )
        return StartResponse(
            audit_id=current_audit["id"],
            sequence_number=current_audit["sequence_number"],
            target_categories=target_categories,
            questions=[QuestionOut(**q) for q in questions_raw],
        )

    if current_audit["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audit is in '{current_audit['status']}' state — cannot start.",
        )

    if not _is_due(current_audit["due_date"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Audit is not yet due. Available from {current_audit['due_date']}.",
        )

    await queries.start_internal_audit(pool, current_audit["id"])

    target_categories = current_audit["target_categories"]
    questions_raw = await queries.get_questions_for_categories(
        pool, institution["id"], institution["category"], target_categories
    )

    return StartResponse(
        audit_id=current_audit["id"],
        sequence_number=current_audit["sequence_number"],
        target_categories=target_categories,
        questions=[QuestionOut(**q) for q in questions_raw],
    )


@router.post("/submit", response_model=AuditSubmitResponse, status_code=201)
async def submit_audit(
    req: AuditSubmitRequest,
    user_id: str = Depends(get_session_user),
):
    """
    Submit internal audit responses.

    On success:
    1. Validates all target-category questions are answered.
    2. Computes per-category scores using the same scoring engine as full assessments.
    3. Persists responses and marks the audit completed.
    4. Updates institution_category_scores for target_categories only (Section 4).
    5. Regenerates Action Queue items only for target_categories (Section 5).
    6. Creates the next internal_audits cycle row with due_date = now + 90 days
       and target_categories recomputed from the current merged category scores.
    7. Returns scores and the next cycle's due_date.
    """
    institution = await _resolve_institution(user_id)
    pool = get_pool()

    current_audit = await queries.get_current_internal_audit(pool, institution["id"])
    if current_audit is None or current_audit["status"] != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No in-progress audit found. Call POST /internal-audit/start first.",
        )

    audit_id = current_audit["id"]
    target_categories = current_audit["target_categories"]

    # Load the live question set for the target categories.
    if target_categories:
        question_map = {
            q["id"]: q
            for q in await queries.get_questions_for_categories(
                pool, institution["id"], institution["category"], target_categories
            )
        }
    else:
        question_map = {}

    submitted_ids = {r.question_id for r in req.responses}
    required_ids = set(question_map.keys())

    if required_ids and (missing := required_ids - submitted_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{len(missing)} question(s) not answered.",
        )

    # Score only the audited categories.
    scored_responses: list[ResponseItem] = [
        ResponseItem(
            question_id=r.question_id,
            answer_value=r.answer_value,
            weight=question_map[r.question_id]["weight"],
            category=question_map[r.question_id]["category"],
        )
        for r in req.responses
        if r.question_id in question_map
    ]

    result = compute_scores(scored_responses)
    # Keep only scores for the audited categories (compute_scores adds all 8,
    # but we only want the ones in target_categories for the snapshot).
    audit_scores = {
        cat: result["category_scores"].get(cat, 0.0)
        for cat in target_categories
    }
    audit_overall = (
        sum(audit_scores.values()) / len(audit_scores)
        if audit_scores else 0.0
    )

    # Persist responses and mark the audit completed.
    await queries.create_internal_audit_responses(
        pool,
        audit_id=audit_id,
        responses=[{"question_id": r.question_id, "answer_value": r.answer_value}
                   for r in req.responses],
    )
    await queries.complete_internal_audit(pool, audit_id, audit_scores)

    # Update institution_category_scores for target_categories only (Section 4).
    await queries.upsert_category_scores(
        pool,
        institution_id=institution["id"],
        category_scores=audit_scores,
        source_type="internal_audit",
        source_id=audit_id,
        categories_to_update=target_categories,
    )

    # Regenerate Action Queue items scoped to target_categories (Section 5).
    generated = generate_action_items(audit_scores)
    # Filter to only items for target_categories (generate_action_items already
    # only produces items for categories not in "Good" band, but we want to be
    # explicit about the scope).
    scoped_items = [it for it in generated if it["category"] in target_categories]
    await queries.regenerate_auto_action_items_scoped(
        pool,
        institution_id=institution["id"],
        items=scoped_items,
        target_categories=target_categories,
    )

    # Compute next cycle's target_categories from current merged scores (Section 3).
    merged_scores = await queries.get_institution_current_scores(pool, institution["id"])
    if merged_scores:
        next_target_categories = [
            cat for cat, score in merged_scores.items()
            if score_label(score) != "Good"
        ]
    else:
        next_target_categories = []

    # Create the next cycle (Section 3 — Cycle N+1).
    next_seq = current_audit["sequence_number"] + 1
    completed_at = datetime.datetime.now(datetime.timezone.utc)
    next_due = (completed_at + datetime.timedelta(days=AUDIT_CADENCE_DAYS)).date()

    await queries.create_internal_audit(
        pool,
        institution_id=institution["id"],
        sequence_number=next_seq,
        triggered_by_type="internal_audit",
        triggered_by_id=audit_id,
        target_categories=next_target_categories,
        due_date=next_due,
    )

    return AuditSubmitResponse(
        audit_id=audit_id,
        sequence_number=current_audit["sequence_number"],
        category_scores=audit_scores,
        overall_score=round(audit_overall, 2),
        next_due_date=next_due,
        next_sequence_number=next_seq,
    )


@router.get("/history", response_model=list[AuditHistoryItem])
async def get_history(user_id: str = Depends(get_session_user)):
    """Return all completed internal audit cycles for the institution, most recent first."""
    institution = await _resolve_institution(user_id)
    pool = get_pool()
    history = await queries.get_audit_history(pool, institution["id"])
    result = []
    for a in history:
        snap = a["audit_score_snapshot"] or {}
        result.append(AuditHistoryItem(
            id=a["id"],
            sequence_number=a["sequence_number"],
            completed_at=a["completed_at"],
            target_categories=a["target_categories"],
            audit_score_snapshot={k: float(v) for k, v in snap.items()},
            triggered_by_type=a["triggered_by_type"],
        ))
    return result
