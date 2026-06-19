"""Quick isolated test of scoring.py — run from backend/ directory."""
import sys
sys.path.insert(0, '.')
from scoring import compute_scores, score_label, RISK_CATEGORIES

responses_full = [
    {"question_id": f"q{i}", "answer_value": 4.0, "weight": 1.0, "category": cat}
    for i, cat in enumerate(RISK_CATEGORIES)
]
r = compute_scores(responses_full)
assert r["overall_score"] == 100.0, f"Expected 100.0, got {r['overall_score']}"
assert len(r["category_scores"]) == 8
assert score_label(r["overall_score"]) == "Good"

responses_zero = [
    {"question_id": f"q{i}", "answer_value": 0.0, "weight": 1.0, "category": cat}
    for i, cat in enumerate(RISK_CATEGORIES)
]
r2 = compute_scores(responses_zero)
assert r2["overall_score"] == 0.0, f"Expected 0.0, got {r2['overall_score']}"
assert score_label(r2["overall_score"]) == "Critical"

# Mixed test: half categories at 4.0, half at 2.0 → expect 75.0 overall
mixed = []
for i, cat in enumerate(RISK_CATEGORIES):
    val = 4.0 if i < 4 else 2.0
    mixed.append({"question_id": f"q{i}", "answer_value": val, "weight": 1.0, "category": cat})
r3 = compute_scores(mixed)
expected = (4 * 100 + 4 * 50) / 8  # 75.0
assert r3["overall_score"] == expected, f"Expected {expected}, got {r3['overall_score']}"
assert score_label(r3["overall_score"]) == "Good"  # 75 > 70 threshold

print("All scoring assertions passed.")
print(f"  Full score  : {r['overall_score']} ({score_label(r['overall_score'])})")
print(f"  Zero score  : {r2['overall_score']} ({score_label(r2['overall_score'])})")
print(f"  Mixed score : {r3['overall_score']} ({score_label(r3['overall_score'])})")
