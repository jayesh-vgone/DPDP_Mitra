from typing import Optional
from pydantic import BaseModel, field_validator


class QuestionOut(BaseModel):
    id: str
    institution_category: str
    category: str
    question_text: str
    dpdp_section: Optional[str]
    weight: float
    order_index: int
    answer_type: str


class ResponseIn(BaseModel):
    question_id: str
    answer_value: float

    @field_validator("answer_value")
    @classmethod
    def valid_range(cls, v: float) -> float:
        if v < 0 or v > 4:
            raise ValueError("answer_value must be between 0 and 4")
        return v


class SubmitRequest(BaseModel):
    responses: list[ResponseIn]


class AttemptOut(BaseModel):
    id: str
    institution_id: str
    submitted_by_user_id: Optional[str]
    overall_score: float
    category_scores: dict[str, float]
    created_at: str


class ScoresResponse(BaseModel):
    latest: Optional[AttemptOut]
    history: list[AttemptOut]


class SubmitResponse(BaseModel):
    attempt_id: str
    overall_score: float
    category_scores: dict[str, float]
    status_label: str
