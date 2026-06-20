"""
Pydantic models for the admin panel (English-only internal tool).

Covers admin auth, seed/master question-bank CRUD, and institution verification.
"""

from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ─────────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    id: str
    email: str


# ── Questions ────────────────────────────────────────────────────────────────

InstitutionCategory = Literal["school", "higher_ed", "edtech"]
AnswerType = Literal["scale", "boolean"]

# The 8 fixed risk categories — admin may add/edit questions within these, but
# cannot invent new categories. Kept in sync with scoring.RISK_CATEGORIES.
RISK_CATEGORIES = [
    "Consent Management",
    "Data Security",
    "Vendor / Data Processor Risk",
    "Data Retention",
    "Children's Data",
    "Breach Readiness",
    "Cross-Border Transfer",
    "Grievance Redressal",
]


class AdminQuestionOut(BaseModel):
    id: str
    institution_category: str
    category: str
    question_text: str
    dpdp_section: Optional[str]
    weight: float
    order_index: int
    answer_type: str
    is_active: bool


class QuestionUpdateRequest(BaseModel):
    """All fields optional — only provided fields are changed. category is NOT editable."""
    question_text: Optional[str] = None
    dpdp_section: Optional[str] = None
    weight: Optional[float] = None
    answer_type: Optional[AnswerType] = None
    is_active: Optional[bool] = None

    @field_validator("weight")
    @classmethod
    def weight_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("weight must be a positive number")
        return v

    @field_validator("question_text")
    @classmethod
    def text_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("question_text cannot be blank")
        return v.strip() if v is not None else v


class QuestionCreateRequest(BaseModel):
    institution_category: InstitutionCategory
    category: str
    question_text: str
    dpdp_section: Optional[str] = None
    weight: float = 1.0
    answer_type: AnswerType = "scale"

    @field_validator("category")
    @classmethod
    def category_is_known(cls, v: str) -> str:
        if v not in RISK_CATEGORIES:
            raise ValueError(f"category must be one of the 8 risk categories: {RISK_CATEGORIES}")
        return v

    @field_validator("weight")
    @classmethod
    def weight_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("weight must be a positive number")
        return v

    @field_validator("question_text")
    @classmethod
    def text_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question_text cannot be blank")
        return v.strip()


# ── Institution verification ─────────────────────────────────────────────────

class AdminInstitutionOut(BaseModel):
    id: str
    name: str
    category: str
    location: Optional[str]
    student_count: Optional[int]
    staff_count: Optional[int]
    institution_subtype: Optional[str]
    location_verified: bool
    student_count_verified: bool
    staff_count_verified: bool
    institution_subtype_verified: bool
    pending_count: int


class VerifyFieldRequest(BaseModel):
    field: Literal["location", "student_count", "staff_count", "institution_subtype"]
