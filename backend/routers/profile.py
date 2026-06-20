"""
Profile router — view and edit the current user's account fields.

Endpoints:
  GET /profile                      — name, email + institution details (editable + read-only)
  PUT /profile                      — update name and/or email
  PUT /profile/institution-details  — update location, counts, institution_subtype
  PUT /profile/password             — change password (requires current password)

Per-field change-detection for institution-details: a field's *_verified flag is reset
to false ONLY when the submitted value differs from the currently stored value. Re-saving
the same value leaves the verified flag unchanged.
"""

import logging
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status

from constants import SUBTYPE_ALLOWED
from db.pool import get_pool
from db import queries
from middleware.session import get_session_user
from schemas.profile import (
    ChangePasswordRequest,
    InstitutionDetailsOut,
    ProfileResponse,
    UpdateInstitutionDetailsRequest,
    UpdateProfileRequest,
)

router = APIRouter(prefix="/profile", tags=["profile"])
log = logging.getLogger(__name__)


def _institution_details_out(inst: dict) -> InstitutionDetailsOut:
    return InstitutionDetailsOut(
        name=inst["name"],
        type=inst["type"],
        category=inst["category"],
        plan=inst["plan"],
        board=inst.get("board"),
        location=inst.get("location"),
        student_count=inst.get("student_count"),
        staff_count=inst.get("staff_count"),
        institution_subtype=inst.get("institution_subtype"),
        location_verified=inst.get("location_verified", False),
        student_count_verified=inst.get("student_count_verified", False),
        staff_count_verified=inst.get("staff_count_verified", False),
        institution_subtype_verified=inst.get("institution_subtype_verified", False),
    )


@router.get("", response_model=ProfileResponse)
async def get_profile(user_id: str = Depends(get_session_user)):
    pool = get_pool()
    user = await queries.get_user_by_id(pool, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    institution_out: Optional[InstitutionDetailsOut] = None
    if user.get("institution_id"):
        inst = await queries.get_institution_by_id(pool, user["institution_id"])
        if inst:
            institution_out = _institution_details_out(inst)

    return ProfileResponse(
        name=user["display_name"],
        email=user["email"],
        institution=institution_out,
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    req: UpdateProfileRequest,
    user_id: str = Depends(get_session_user),
):
    pool = get_pool()

    if req.name is None and req.email is None:
        user = await queries.get_user_by_id(pool, user_id)
        institution_out = None
        if user and user.get("institution_id"):
            inst = await queries.get_institution_by_id(pool, user["institution_id"])
            if inst:
                institution_out = _institution_details_out(inst)
        return ProfileResponse(
            name=user["display_name"] if user else None,
            email=user["email"] if user else None,
            institution=institution_out,
        )

    if req.email is not None:
        existing = await queries.get_user_by_email(pool, req.email)
        if existing is not None and existing["id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )

    await queries.update_user_profile(pool, user_id, name=req.name, email=req.email)

    user = await queries.get_user_by_id(pool, user_id)
    institution_out = None
    if user and user.get("institution_id"):
        inst = await queries.get_institution_by_id(pool, user["institution_id"])
        if inst:
            institution_out = _institution_details_out(inst)

    return ProfileResponse(
        name=user["display_name"] if user else None,
        email=user["email"] if user else None,
        institution=institution_out,
    )


@router.put("/institution-details", response_model=InstitutionDetailsOut)
async def update_institution_details(
    req: UpdateInstitutionDetailsRequest,
    user_id: str = Depends(get_session_user),
):
    """
    Update the four editable institution-level fields.

    Each field is compared against the current stored value:
    - If changed: persist new value AND reset that field's *_verified to false.
    - If unchanged (same value re-submitted): leave *_verified exactly as-is.

    institution_subtype is validated against the allowed list for this institution's
    category. EdTech institutions cannot set a subtype (category='edtech' → must be null).
    """
    pool = get_pool()
    user = await queries.get_user_by_id(pool, user_id)
    if user is None or not user.get("institution_id"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    inst = await queries.get_institution_by_id(pool, user["institution_id"])
    if inst is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    # Validate institution_subtype against allowed values for this category
    if req.institution_subtype is not None:
        allowed = SUBTYPE_ALLOWED.get(inst["category"], [])
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"institution_subtype is not applicable for category '{inst['category']}'",
            )
        if req.institution_subtype not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{req.institution_subtype}' is not a valid subtype for category '{inst['category']}'. "
                       f"Allowed: {allowed}",
            )

    # Build update dict — only include fields that actually changed
    updates: dict = {}

    location_val = req.location  # already stripped/normalized by Pydantic validator
    if location_val != inst.get("location"):
        updates["location"] = location_val
        updates["location_verified"] = False

    if req.student_count != inst.get("student_count"):
        updates["student_count"] = req.student_count
        updates["student_count_verified"] = False

    if req.staff_count != inst.get("staff_count"):
        updates["staff_count"] = req.staff_count
        updates["staff_count_verified"] = False

    subtype_val = req.institution_subtype
    if subtype_val != inst.get("institution_subtype"):
        updates["institution_subtype"] = subtype_val
        updates["institution_subtype_verified"] = False

    if updates:
        await queries.update_institution_fields(pool, inst["id"], updates)

    refreshed = await queries.get_institution_by_id(pool, inst["id"])
    return _institution_details_out(refreshed)


@router.put("/password", status_code=200)
async def change_password(
    req: ChangePasswordRequest,
    user_id: str = Depends(get_session_user),
):
    pool = get_pool()

    stored_hash = await queries.get_user_password_hash(pool, user_id)
    if not stored_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set on this account",
        )

    if not bcrypt.checkpw(req.old_password.encode(), stored_hash.encode()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    await queries.update_user_password(pool, user_id, new_hash)

    return {"message": "Password changed successfully"}
