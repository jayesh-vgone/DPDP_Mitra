"""
Pydantic schemas for the Internal Audit module.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from schemas.assessment import QuestionOut, ResponseIn


class InternalAuditStatus(BaseModel):
    """
    Returned by GET /internal-audit/status.

    status values:
      not_applicable  — institution has no completed assessment yet
      pending         — cycle exists, may or may not be due yet
      in_progress     — audit has been started, responses expected
      completed       — current cycle is done; next cycle row exists

    is_due     = due_date <= today (only meaningful when status=pending)
    can_start  = is_due AND status=pending
    days_overdue = max(0, today - due_date) in whole days; 0 when not due
    """
    status: str                              # not_applicable | pending | in_progress | completed
    sequence_number: Optional[int] = None
    due_date: Optional[date] = None
    is_due: bool = False
    days_overdue: int = 0
    can_start: bool = False
    target_categories: list[str] = []


class StartResponse(BaseModel):
    """Returned by POST /internal-audit/start."""
    audit_id: str
    sequence_number: int
    target_categories: list[str]
    questions: list[QuestionOut]


class AuditSubmitRequest(BaseModel):
    responses: list[ResponseIn]


class AuditCategoryScore(BaseModel):
    category: str
    score: float
    band: str     # Critical | Moderate | Good


class AuditSubmitResponse(BaseModel):
    audit_id: str
    sequence_number: int
    category_scores: dict[str, float]
    overall_score: float   # average of the audited target_categories only
    next_due_date: date
    next_sequence_number: int


class AuditHistoryItem(BaseModel):
    """One completed cycle, for GET /internal-audit/history."""
    id: str
    sequence_number: int
    completed_at: datetime
    target_categories: list[str]
    audit_score_snapshot: dict[str, float]
    triggered_by_type: str
