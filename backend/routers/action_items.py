"""
Action Queue router — the Dashboard remediation tracker.

Endpoints (all session-protected, scoped to the caller's institution):
  GET    /action-items        — list all (auto + custom), sorted by priority
  POST   /action-items        — create a custom item (is_custom=true)
  PATCH  /action-items/{id}    — edit any field on any item (auto or custom)
  DELETE /action-items/{id}    — remove any item (auto or custom)

Auto-generation of items happens elsewhere — inside POST /assessment/submit — not here.
These endpoints are the manual/editing half of the hybrid model.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from db.pool import get_pool
from db import queries
from middleware.session import get_session_user
from schemas.action_items import (
    ActionItemOut,
    CreateActionItemRequest,
    UpdateActionItemRequest,
)

router = APIRouter(prefix="/action-items", tags=["action-items"])


async def _resolve_institution_id(user_id: str) -> str:
    pool = get_pool()
    user = await queries.get_user_by_id(pool, user_id)
    if not user or not user.get("institution_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no associated institution",
        )
    return user["institution_id"]


@router.get("", response_model=list[ActionItemOut])
async def get_action_items(user_id: str = Depends(get_session_user)):
    institution_id = await _resolve_institution_id(user_id)
    pool = get_pool()
    return await queries.list_action_items(pool, institution_id)


@router.post("", response_model=ActionItemOut, status_code=201)
async def create_action_item(
    req: CreateActionItemRequest,
    user_id: str = Depends(get_session_user),
):
    institution_id = await _resolve_institution_id(user_id)
    pool = get_pool()
    return await queries.create_custom_action_item(
        pool,
        institution_id=institution_id,
        category=req.category,
        task_text=req.task_text,
        priority_level=req.priority_level,
        effort_estimate=req.effort_estimate,
    )


@router.patch("/{item_id}", response_model=ActionItemOut)
async def update_action_item(
    item_id: str,
    req: UpdateActionItemRequest,
    user_id: str = Depends(get_session_user),
):
    institution_id = await _resolve_institution_id(user_id)
    pool = get_pool()

    # Only include explicitly-provided fields so unset fields stay unchanged.
    updates = req.model_dump(exclude_unset=True, exclude_none=True)
    item = await queries.update_action_item(pool, item_id, institution_id, updates)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action item not found",
        )
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_action_item(
    item_id: str,
    user_id: str = Depends(get_session_user),
):
    institution_id = await _resolve_institution_id(user_id)
    pool = get_pool()
    deleted = await queries.delete_action_item(pool, item_id, institution_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action item not found",
        )
