"""
Action Queue auto-generation — deterministic, rule-based (NO LLM call).

Consistent with how scoring.py and get_category_explanation already work: a pure,
reproducible mapping from a freshly computed assessment result to a set of suggested
remediation tasks. The router calls generate_action_items() inside POST /assessment/submit
right after scores are computed, then persists the result (replacing the institution's
existing auto-generated items, leaving custom items untouched).

Rules (locked — see CLAUDE.md Action Queue section):
  - One task per category whose score is NOT in the "Good" band (i.e. score <= 70).
  - Sort qualifying categories ascending by score (lowest/worst first).
  - Assign priority P1, P2, P3 ... in that order; cap at MAX_GENERATED tasks.
  - Critical band (score <= 40) -> priority_level 'HIGH'.
  - Moderate band (40 < score <= 70) -> priority_level 'MED'.
  - task_text + effort_estimate come from a static per-category lookup below.
"""

from __future__ import annotations

from typing import TypedDict

from scoring import score_label


# Cap the number of auto-generated tasks so the queue stays actionable even if
# every category qualifies. The worst MAX_GENERATED categories get a task.
MAX_GENERATED = 6


class GeneratedItem(TypedDict):
    category: str
    task_text: str
    priority: str          # 'P1'..'P6'
    priority_level: str    # 'HIGH' | 'MED'
    effort_estimate: str


# Per-category canned, actionable remediation phrasings. The first entry is used
# for generation (deterministic); the list leaves room to rotate in a later version.
CATEGORY_TASKS: dict[str, list[str]] = {
    "Consent Management": [
        "Implement granular, purpose-specific consent capture with easy withdrawal",
        "Audit existing consent records for validity under Sections 6 & 7",
    ],
    "Data Security": [
        "Deploy encryption-at-rest and access controls for personal data stores",
        "Run a security gap assessment against Section 8(5) safeguards",
    ],
    "Vendor / Data Processor Risk": [
        "Put DPDP-compliant data processing agreements in place with all vendors",
        "Inventory all data processors and assess their Section 8(2) compliance",
    ],
    "Data Retention": [
        "Define and enforce a data retention & deletion schedule per Section 8(7)",
        "Identify and purge personal data retained beyond its lawful purpose",
    ],
    "Children's Data": [
        "Implement verifiable parental consent for users under 18 (Section 9)",
        "Disable behavioural tracking and targeted ads for children's accounts",
    ],
    "Breach Readiness": [
        "Create a breach response plan with 72-hour Board & Principal notification",
        "Run a tabletop breach drill and document escalation responsibilities",
    ],
    "Cross-Border Transfer": [
        "Map cross-border data flows and confirm Section 16 transfer compliance",
        "Review hosting/SDK locations and restrict transfers to permitted countries",
    ],
    "Grievance Redressal": [
        "Appoint a grievance officer and publish a Data Principal complaint channel",
        "Define SLA-bound workflows for handling Section 13 grievance requests",
    ],
}

# Per-category default effort estimate (simple static strings, directionally useful).
CATEGORY_EFFORT: dict[str, str] = {
    "Consent Management": "3-4 wks",
    "Data Security": "4-6 wks",
    "Vendor / Data Processor Risk": "2-3 wks",
    "Data Retention": "2-3 wks",
    "Children's Data": "3-4 wks",
    "Breach Readiness": "1-2 wks",
    "Cross-Border Transfer": "2-3 wks",
    "Grievance Redressal": "1-2 wks",
}


def generate_action_items(category_scores: dict[str, float]) -> list[GeneratedItem]:
    """
    Build the auto-generated task list for a freshly computed attempt.

    Takes the attempt's category_scores ({category: score}) and returns a sorted,
    prioritised list of GeneratedItem dicts ready to be inserted. Categories in the
    "Good" band are skipped. Returns an empty list if every category is Good.
    """
    # Qualifying = not in the Good band (score <= 70). Sort lowest score first.
    qualifying = [
        (cat, score)
        for cat, score in category_scores.items()
        if score_label(score) != "Good"
    ]
    qualifying.sort(key=lambda pair: pair[1])  # ascending by score

    items: list[GeneratedItem] = []
    for idx, (category, score) in enumerate(qualifying[:MAX_GENERATED]):
        band = score_label(score)
        priority_level = "HIGH" if band == "Critical" else "MED"
        tasks = CATEGORY_TASKS.get(category, [f"Improve {category} compliance"])
        items.append(
            GeneratedItem(
                category=category,
                task_text=tasks[0],
                priority=f"P{idx + 1}",
                priority_level=priority_level,
                effort_estimate=CATEGORY_EFFORT.get(category, "2-3 wks"),
            )
        )
    return items
