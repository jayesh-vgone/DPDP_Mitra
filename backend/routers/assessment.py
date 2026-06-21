"""
Assessment router — Phase 6a.

Three endpoints, all session-protected. No UI consumes these yet; they are
built and verified correct in 6a so Phase 6b can build the wizard on top of
a known-good data layer.

Endpoints:
  GET  /assessment/questions   — questions for the caller's institution category
  POST /assessment/submit      — submit a full answer set; returns computed scores
  GET  /assessment/scores      — latest + history of attempts for the institution
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from db.pool import get_pool
from db import queries
from middleware.session import get_session_user
from schemas.assessment import (
    QuestionOut,
    ScoresResponse,
    SubmitRequest,
    SubmitResponse,
    AttemptOut,
    CategoryDetailOut,
    CategoryQuestionOut,
)
from scoring import (
    compute_scores, score_label, ResponseItem,
    CATEGORY_SLUGS, get_category_explanation,
)
from action_items import generate_action_items

router = APIRouter(prefix="/assessment", tags=["assessment"])


async def _resolve_institution(user_id: str) -> dict:
    """
    Look up the institution for the current user.
    Raises 400 if the user has no institution_id (shouldn't happen after Phase 5,
    but guards against stale dev-user rows).
    """
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


@router.get("/questions", response_model=list[QuestionOut])
async def get_questions(user_id: str = Depends(get_session_user)):
    """
    Return all questions for the calling user's institution category.

    The category is looked up server-side from the institution row — the
    frontend never needs to send or know the category.

    Questions are ordered by order_index (the order they were seeded).
    """
    institution = await _resolve_institution(user_id)
    category = institution["category"]
    pool = get_pool()
    return await queries.get_questions_for_category(pool, category)


@router.post("/submit", response_model=SubmitResponse, status_code=201)
async def submit_assessment(
    req: SubmitRequest,
    user_id: str = Depends(get_session_user),
):
    """
    Submit a completed assessment.

    Validation:
    1. All questions for the institution's category must be answered.
    2. No answers for questions from other categories are accepted.

    On success:
    - Computes per-category and overall scores via scoring.py.
    - Creates one assessment_attempts row (denormalized scores snapshot).
    - Creates one assessment_responses row per answer, linked via attempt_id.
    - Returns computed scores immediately.

    Submitting again always creates a new attempt — no overwrite.
    """
    institution = await _resolve_institution(user_id)
    pool = get_pool()

    # Load the canonical question map for this institution category.
    # question_map: { question_id: {id, category, weight, ...} }
    question_map = await queries.get_question_map(pool, institution["category"])

    if not question_map:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No questions found for this institution category. Run seed_questions.py first.",
        )

    submitted_ids = {r.question_id for r in req.responses}
    required_ids = set(question_map.keys())

    missing = required_ids - submitted_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{len(missing)} question(s) not answered. All questions are required.",
        )

    extra = submitted_ids - required_ids
    if extra:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{len(extra)} unrecognised question id(s) in submission.",
        )

    # Build the ResponseItem list that scoring.py expects.
    scored_responses: list[ResponseItem] = [
        ResponseItem(
            question_id=r.question_id,
            answer_value=r.answer_value,
            weight=question_map[r.question_id]["weight"],
            category=question_map[r.question_id]["category"],
        )
        for r in req.responses
    ]

    result = compute_scores(scored_responses)

    # Persist the attempt and individual responses.
    attempt_id = await queries.create_assessment_attempt(
        pool,
        institution_id=institution["id"],
        user_id=user_id,
        overall_score=result["overall_score"],
        category_scores=result["category_scores"],
    )
    await queries.create_assessment_responses(
        pool,
        attempt_id=attempt_id,
        # Snapshot the question as it is right now, so a later admin edit never
        # rewrites this historical attempt's stored question text/weight/section.
        responses=[
            {
                "question_id": r.question_id,
                "answer_value": r.answer_value,
                "question_text": question_map[r.question_id]["question_text"],
                "dpdp_section": question_map[r.question_id]["dpdp_section"],
                "weight": question_map[r.question_id]["weight"],
                "answer_type": question_map[r.question_id]["answer_type"],
            }
            for r in req.responses
        ],
    )

    # Regenerate the Action Queue: replace this institution's AUTO-generated items
    # (custom items are left untouched) with a fresh deterministic set derived from
    # the new attempt's category scores. Rule-based — no LLM call.
    generated = generate_action_items(result["category_scores"])
    await queries.regenerate_auto_action_items(
        pool,
        institution_id=institution["id"],
        items=generated,
    )

    return SubmitResponse(
        attempt_id=attempt_id,
        overall_score=result["overall_score"],
        category_scores=result["category_scores"],
        status_label=score_label(result["overall_score"]),
    )


@router.get("/{attempt_id}/categories/{category_slug}", response_model=CategoryDetailOut)
async def get_category_detail(
    attempt_id: str,
    category_slug: str,
    user_id: str = Depends(get_session_user),
):
    """
    Return per-question drill-down for one risk category within a specific attempt.

    The attempt must belong to the calling user's institution — prevents
    cross-institution data access.
    """
    # Resolve the slug back to the canonical category name
    category = CATEGORY_SLUGS.get(category_slug)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown category slug: {category_slug}",
        )

    institution = await _resolve_institution(user_id)
    pool = get_pool()

    # Authorization: confirm the attempt belongs to this institution
    attempt = await queries.get_attempt_by_id(pool, attempt_id, institution["id"])
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    score_pct = attempt["category_scores"].get(category, 0.0)
    maturity_band = score_label(score_pct)

    question_rows = await queries.get_category_detail_for_attempt(pool, attempt_id, category)

    # Derive low-scoring questions for the explanation (sorted ascending by answer)
    scored = sorted(question_rows, key=lambda q: q["answer_value"])
    low_qs = [q["question_text"] for q in scored if q["answer_value"] <= 2][:2]
    if not low_qs:
        low_qs = [scored[0]["question_text"]] if scored else []

    explanation = get_category_explanation(category, score_pct, maturity_band, low_qs)

    return CategoryDetailOut(
        category=category,
        score_pct=round(score_pct, 1),
        maturity_band=maturity_band,
        explanation=explanation,
        questions=[CategoryQuestionOut(**q) for q in question_rows],
    )


@router.get("/{attempt_id}/report")
async def download_report(
    attempt_id: str,
    user_id: str = Depends(get_session_user),
):
    """
    Generate and stream a branded PDF compliance report for one assessment attempt.
    """
    institution = await _resolve_institution(user_id)
    pool = get_pool()

    attempt = await queries.get_attempt_by_id(pool, attempt_id, institution["id"])
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    from report import generate_pdf

    # PDF generation is synchronous (ReportLab); run in thread pool
    pdf_bytes = await asyncio.to_thread(generate_pdf, attempt, institution)

    filename = f"dpdp-compliance-report-{attempt_id[:8]}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/scores", response_model=ScoresResponse)
async def get_scores(user_id: str = Depends(get_session_user)):
    """
    Return the latest assessment attempt + full history for the institution.

    Returns {"latest": null, "history": []} if no assessment has been taken yet.
    The frontend uses `latest == null` to decide whether to show the blank-state CTA
    or the real dashboard visualisations.
    """
    institution = await _resolve_institution(user_id)
    pool = get_pool()
    data = await queries.get_assessment_scores(pool, institution["id"])

    def to_out(a: dict) -> AttemptOut:
        return AttemptOut(**a)

    return ScoresResponse(
        latest=to_out(data["latest"]) if data["latest"] else None,
        history=[to_out(a) for a in data["history"]],
    )
