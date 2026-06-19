"""
Lightweight intent classifier for the DPDP Mitra chat pipeline.

Detects whether the user is asking about their own compliance status/score
so the router can inject assessment context alongside the RAG chunks.

Approach: keyword/phrase matching (deterministic, zero latency, no extra API call).
Covers English, Hindi, and common Hinglish patterns observed in testing.
"""

from __future__ import annotations

# Phrases that signal a self-referential compliance/score question.
# All matched case-insensitively on the user message.
_SCORE_PHRASES: list[str] = [
    # English
    "how am i doing",
    "how is my",
    "my score",
    "my compliance",
    "my assessment",
    "my performance",
    "my result",
    "weakest area",
    "weakest category",
    "lowest score",
    "lowest category",
    "what should i fix",
    "what should i improve",
    "improve my",
    "areas to improve",
    "priority areas",
    "which area",
    "worst area",
    "best area",
    "category score",
    "my overall",
    "my rating",
    "am i compliant",
    "are we compliant",
    "how well",
    "what are my weak",
    "where am i weak",
    "where are we weak",
    "how did i score",
    "how did we score",
    # Hindi
    "मेरा स्कोर",
    "मेरी स्थिति",
    "कमज़ोर",
    "कमजोर",
    "क्या सुधारें",
    "सुधार करना",
    "मेरा प्रदर्शन",
    "प्राथमिकता",
    "कौन सा क्षेत्र",
    "सबसे कम",
    "मेरा मूल्यांकन",
    "हम कैसे",
    "हम कितने",
]


def is_score_query(message: str) -> bool:
    """
    Return True if the message is asking about the user's own compliance
    status, score, or category performance.

    False positives are acceptable — the worst case is injecting assessment
    context that wasn't strictly needed. False negatives mean the user doesn't
    get the personalised context they asked for.
    """
    lower = message.lower()
    return any(phrase in lower for phrase in _SCORE_PHRASES)
