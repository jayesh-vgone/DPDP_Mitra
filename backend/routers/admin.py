"""
Admin panel router — separate auth realm, internal/expert tool (English-only).

Auth (cookie: admin_session, table: admin_sessions — fully separate from the
institution dpdp_session realm):
  POST /admin/login   — verify admin_users credentials, set admin_session cookie
  POST /admin/logout  — delete the admin session
  GET  /admin/me      — return the current admin (session check)

Seed question-bank CRUD (all protected by get_current_admin):
  GET  /admin/questions?institution_category=school  — all (active + inactive)
  PUT  /admin/questions/{question_id}                — edit fields / toggle active
  POST /admin/questions                              — add a new question

Institution verification (all protected by get_current_admin):
  GET   /admin/institutions?search=   — list all institutions with pending counts
  PATCH /admin/institutions/{id}/verify-field  — verify one editable field

Out of scope here (deferred): per-institution forking, auto-clone at signup,
change-audit log. There is ONE shared question bank per institution_category.
"""

import bcrypt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from typing import Optional

from constants import VERIFIABLE_INSTITUTION_FIELDS
from db.pool import get_pool
from db import queries
from middleware.admin_session import get_current_admin, ADMIN_SESSION_COOKIE
from schemas.admin import (
    AdminInstitutionOut,
    AdminLoginRequest,
    AdminOut,
    AdminQuestionOut,
    QuestionCreateRequest,
    QuestionUpdateRequest,
    RISK_CATEGORIES,
    VerifyFieldRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])

# 7 days — aligns with ADMIN_SESSION_TTL_DAYS in queries.py
_COOKIE_MAX_AGE = 7 * 24 * 60 * 60


def _set_admin_cookie(response: Response, session_id: str, secure: bool = False) -> None:
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE,
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


# ── Auth ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AdminOut)
async def admin_login(req: AdminLoginRequest, response: Response):
    """Verify against admin_users, create an admin session, set the cookie."""
    pool = get_pool()
    admin = await queries.get_admin_by_email(pool, req.email)

    # Generic error for both unknown-email and wrong-password (no enumeration).
    if admin is None or not bcrypt.checkpw(
        req.password.encode(), admin["password_hash"].encode()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    session_id = await queries.create_admin_session(pool, admin["id"])
    _set_admin_cookie(response, session_id)
    return AdminOut(id=admin["id"], email=admin["email"])


@router.post("/logout", status_code=204)
async def admin_logout(
    response: Response,
    admin_session: Optional[str] = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
):
    """Delete the admin session row and clear the cookie. Idempotent."""
    if admin_session:
        pool = get_pool()
        await queries.delete_admin_session(pool, admin_session)
    response.delete_cookie(key=ADMIN_SESSION_COOKIE, path="/")


@router.get("/me", response_model=AdminOut)
async def admin_me(admin_id: str = Depends(get_current_admin)):
    """Return the current admin — used by the frontend to gate the /admin area."""
    pool = get_pool()
    admin = await queries.get_admin_by_id(pool, admin_id)
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
    return AdminOut(**admin)


# ── Question bank CRUD ───────────────────────────────────────────────────────

@router.get("/questions", response_model=list[AdminQuestionOut])
async def list_questions(
    institution_category: str,
    admin_id: str = Depends(get_current_admin),
):
    """
    All questions (active AND inactive) for one institution_category, ordered by
    risk category then order_index. The frontend groups by the 8 risk categories.
    """
    if institution_category not in ("school", "higher_ed", "edtech"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="institution_category must be one of: school, higher_ed, edtech",
        )
    pool = get_pool()
    return await queries.admin_list_questions(pool, institution_category)


@router.put("/questions/{question_id}", response_model=AdminQuestionOut)
async def update_question(
    question_id: str,
    req: QuestionUpdateRequest,
    admin_id: str = Depends(get_current_admin),
):
    """
    Edit question_text / dpdp_section / weight / answer_type / is_active.
    The risk `category` is intentionally immutable. Editing here only affects
    FUTURE assessments — past attempts kept their own snapshot at submission time.
    """
    pool = get_pool()
    updated = await queries.admin_update_question(
        pool,
        question_id,
        question_text=req.question_text,
        dpdp_section=req.dpdp_section,
        weight=req.weight,
        answer_type=req.answer_type,
        is_active=req.is_active,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return updated


@router.post("/questions", response_model=AdminQuestionOut, status_code=201)
async def create_question(
    req: QuestionCreateRequest,
    admin_id: str = Depends(get_current_admin),
):
    """Add a new question to a category within one institution_category's bank."""
    pool = get_pool()
    return await queries.admin_create_question(
        pool,
        institution_category=req.institution_category,
        category=req.category,
        question_text=req.question_text,
        dpdp_section=req.dpdp_section,
        weight=req.weight,
        answer_type=req.answer_type,
    )


# ── Institution verification ──────────────────────────────────────────────────

@router.get("/institutions", response_model=list[AdminInstitutionOut])
async def list_institutions(
    search: Optional[str] = None,
    admin_id: str = Depends(get_current_admin),
):
    """
    List all institutions with their four editable fields + verification flags.
    Optional `search` parameter filters by institution name (case-insensitive substring).
    `pending_count` on each row indicates how many non-null fields are still unverified.
    """
    pool = get_pool()
    return await queries.admin_list_institutions(pool, search=search or None)


@router.patch("/institutions/{institution_id}/verify-field", status_code=200)
async def verify_institution_field(
    institution_id: str,
    req: VerifyFieldRequest,
    admin_id: str = Depends(get_current_admin),
):
    """
    Mark one editable institution field as verified.

    Only the four user-editable fields can be verified this way:
    location, student_count, staff_count, institution_subtype.
    Returns 400 if the field's current value is null (nothing to verify).
    """
    if req.field not in VERIFIABLE_INSTITUTION_FIELDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"field must be one of: {sorted(VERIFIABLE_INSTITUTION_FIELDS)}",
        )
    pool = get_pool()
    error = await queries.admin_verify_institution_field(pool, institution_id, req.field)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    # Return the updated institution so the frontend can refresh its state
    inst = await queries.get_institution_by_id(pool, institution_id)
    if inst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    pending = 0
    for f in ["location", "student_count", "staff_count", "institution_subtype"]:
        if inst.get(f) is not None and not inst.get(f"{f}_verified", False):
            pending += 1

    return AdminInstitutionOut(
        id=inst["id"],
        name=inst["name"],
        category=inst["category"],
        location=inst.get("location"),
        student_count=inst.get("student_count"),
        staff_count=inst.get("staff_count"),
        institution_subtype=inst.get("institution_subtype"),
        location_verified=inst.get("location_verified", False),
        student_count_verified=inst.get("student_count_verified", False),
        staff_count_verified=inst.get("staff_count_verified", False),
        institution_subtype_verified=inst.get("institution_subtype_verified", False),
        pending_count=pending,
    )
