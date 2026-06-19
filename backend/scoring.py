"""
DPDP Assessment Scoring Engine.

Pure function — no database, no HTTP, no side effects.
Input comes from the router after it fetches questions and merges weights.
Output is stored by the router in the assessment_attempts table.

Algorithm (locked — see CLAUDE.md Phase 6a):

  Per risk category:
    category_score = ( sum(answer_value * weight) / sum(weight) ) / 4 * 100

  Overall:
    overall_score = average of the 8 category_scores

Scale: 0 (worst) → 100 (best).
Status labels:
  0–40   Critical
  41–70  Moderate
  71–100 Good
"""

from __future__ import annotations

from typing import TypedDict


class ResponseItem(TypedDict):
    question_id: str
    answer_value: float
    weight: float
    category: str


class ScoreResult(TypedDict):
    category_scores: dict[str, float]
    overall_score: float


# The 8 canonical risk categories. Every question set must cover all 8.
# Defining them here ensures a category with every answer = 0 still appears
# in category_scores (as 0.0) rather than being absent from the result.
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


def compute_scores(responses: list[ResponseItem]) -> ScoreResult:
    """
    Compute per-category and overall compliance scores from a list of responses.

    Each item in `responses` must have:
        question_id  : str   (for audit/tracing only, not used in math)
        answer_value : float (scale: 0-4, or boolean: 0 or 4)
        weight       : float (from assessment_questions.weight)
        category     : str   (one of RISK_CATEGORIES)

    Returns:
        category_scores : dict[str, float]  values 0.0 – 100.0
        overall_score   : float             0.0 – 100.0
    """
    # Accumulate weighted sums per category
    weighted_sum: dict[str, float] = {cat: 0.0 for cat in RISK_CATEGORIES}
    weight_total: dict[str, float] = {cat: 0.0 for cat in RISK_CATEGORIES}

    for r in responses:
        cat = r["category"]
        if cat not in weighted_sum:
            # Unknown category — include it rather than silently dropping
            weighted_sum[cat] = 0.0
            weight_total[cat] = 0.0
        weighted_sum[cat] += float(r["answer_value"]) * float(r["weight"])
        weight_total[cat] += float(r["weight"])

    # Compute per-category score. Guard against zero-weight categories.
    category_scores: dict[str, float] = {}
    for cat in RISK_CATEGORIES:
        wt = weight_total[cat]
        if wt == 0:
            category_scores[cat] = 0.0
        else:
            raw = weighted_sum[cat] / wt / 4.0 * 100.0
            category_scores[cat] = round(raw, 2)

    # Overall = simple average of all 8 category scores
    overall = sum(category_scores.values()) / len(RISK_CATEGORIES)
    overall_score = round(overall, 2)

    return ScoreResult(category_scores=category_scores, overall_score=overall_score)


def score_label(overall_score: float) -> str:
    """Human-readable status label for a given overall score."""
    if overall_score <= 40:
        return "Critical"
    if overall_score <= 70:
        return "Moderate"
    return "Good"
