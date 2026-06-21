"""
Pydantic models for the Action Queue (remediation tracker) endpoints.
"""

from typing import Optional, Literal

from pydantic import BaseModel, field_validator


PriorityLevel = Literal["HIGH", "MED"]
ActionStatus = Literal["not_started", "in_progress", "done"]


class ActionItemOut(BaseModel):
    id: str
    institution_id: str
    category: str
    task_text: str
    priority: str
    priority_level: str
    effort_estimate: Optional[str]
    status: str
    is_custom: bool
    created_at: str
    updated_at: str


class CreateActionItemRequest(BaseModel):
    category: str
    task_text: str
    effort_estimate: Optional[str] = None
    priority_level: PriorityLevel

    @field_validator("category", "task_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class UpdateActionItemRequest(BaseModel):
    """All fields optional — only those provided are updated."""
    task_text: Optional[str] = None
    category: Optional[str] = None
    effort_estimate: Optional[str] = None
    priority_level: Optional[PriorityLevel] = None
    status: Optional[ActionStatus] = None
