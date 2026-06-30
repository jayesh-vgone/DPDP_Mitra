"""
Regression test for the out-of-scope vendor/firm recommendation guardrail.

Verifies:
  1. The detection helper logs an `out_of_scope_recommendation` warning when a
     reply names denylisted firms or enumerates "firms such as X, Y, Z".
  2. A clean, in-scope reply produces no such warning.
  3. The expected good-behaviour reply (declining to recommend providers) does
     NOT contain any denylisted firm name, and contains no citation tag attached
     to a list of proper nouns.

Run from backend/:  python scripts/test_out_of_scope.py
"""
import sys
import logging
sys.path.insert(0, ".")

from guardrails import _check_out_of_scope_recommendation, _FIRM_DENYLIST


class _CaptureHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records = []

    def emit(self, record):
        self.records.append(record.getMessage())


def _warnings_for(reply: str) -> list[str]:
    logger = logging.getLogger("guardrails")
    handler = _CaptureHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.WARNING)
    try:
        _check_out_of_scope_recommendation(reply, "which company should I contact for a DPDP assessment")
    finally:
        logger.removeHandler(handler)
    return [m for m in handler.records if "out_of_scope_recommendation" in m]


# 1. Bad reply: names firms → must warn.
bad_reply = (
    "For a DPDP compliance assessment you could engage firms such as Deloitte, "
    "KPMG, PwC and EY, who all offer privacy advisory services. **Sections 39-40**"
)
bad_warnings = _warnings_for(bad_reply)
assert bad_warnings, "Expected an out_of_scope_recommendation warning for the firm-naming reply"

# 2. Good reply: declines to name providers → must NOT warn, and must contain no firm names.
good_reply = (
    "I can explain what the DPDP Act, 2023 requires and what a compliance "
    "assessment under it should cover (consent, **Section 6**; security safeguards, "
    "**Section 8(5)**). I don't recommend specific service providers — evaluate "
    "firms based on demonstrated DPDP and privacy-law experience and relevant "
    "credentials."
)
good_warnings = _warnings_for(good_reply)
assert not good_warnings, f"Did not expect a warning for the in-scope reply, got: {good_warnings}"

for firm in _FIRM_DENYLIST:
    assert firm not in good_reply.lower(), f"Good reply unexpectedly contains denylisted firm: {firm}"

# 3. Enumeration pattern without a known firm name still flags.
enum_reply = "You might consider companies like AlphaSec, BetaPrivacy and GammaCompliance."
assert _warnings_for(enum_reply), "Expected enumeration pattern to be flagged"

print("All out-of-scope recommendation guardrail assertions passed.")
print(f"  bad_reply warnings : {len(bad_warnings)}")
print(f"  good_reply warnings: {len(good_warnings)}")
