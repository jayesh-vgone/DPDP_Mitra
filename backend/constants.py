"""
Shared domain constants used by multiple routers.

SUBTYPE_ALLOWED: per institution_category, the allowed values for institution_subtype.
EdTech institutions don't have a subtype (the field is not applicable — stays null).
"""

SUBTYPE_ALLOWED: dict[str, list[str]] = {
    "higher_ed": [
        "Government (State)",
        "Government (Central)",
        "Deemed to be University",
        "Private University",
        "Institute of National Importance",
    ],
    "school": ["State Board", "CBSE", "ICSE"],
    "edtech": [],  # Not applicable — institution_subtype must stay null
}

# The four institution fields that users can edit from their profile page and
# that admins can verify independently.
VERIFIABLE_INSTITUTION_FIELDS = frozenset(
    ["location", "student_count", "staff_count", "institution_subtype"]
)
