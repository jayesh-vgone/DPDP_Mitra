"""
Transactional email sender using Resend.

Usage:
    await send_otp_email(to_email="user@school.edu.in", otp_code="482913")

If RESEND_API_KEY is not set, raises RuntimeError so the calling endpoint can
surface a clear error rather than silently swallowing a failed send.
"""

import logging
from config import settings

logger = logging.getLogger(__name__)

_FROM_ADDRESS = "EduPrivacy AI <noreply@eduprivacy.ai>"
_SUBJECT = "Your EduPrivacy AI verification code"


def _build_email_html(otp_code: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:40px 0;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;
              border:1px solid #e7e7f0;padding:40px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#4F46E5;padding:12px 16px;
                  border-radius:12px;margin-bottom:16px;">
        <span style="color:white;font-size:20px;">🛡</span>
      </div>
      <h1 style="margin:0;font-size:22px;color:#1B1830;">EduPrivacy AI</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#4F46E5;">DPDP Copilot</p>
    </div>
    <p style="color:#1B1830;font-size:15px;margin-bottom:8px;">
      Your verification code is:
    </p>
    <div style="background:#EEEDFB;border-radius:10px;padding:20px;text-align:center;
                margin:16px 0;">
      <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#4F46E5;">
        {otp_code}
      </span>
    </div>
    <p style="color:#6B7280;font-size:13px;margin-top:16px;">
      This code expires in <strong>10 minutes</strong>. If you didn&apos;t request this,
      you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #E7E7F0;margin:24px 0;">
    <p style="color:#9A95B5;font-size:12px;text-align:center;margin:0;">
      EduPrivacy AI — DPDP Compliance for Educational Institutions
    </p>
  </div>
</body>
</html>
"""


def _build_email_text(otp_code: str) -> str:
    return (
        f"Your EduPrivacy AI verification code is: {otp_code}\n\n"
        "This code expires in 10 minutes.\n\n"
        "If you didn't request this, you can safely ignore this email."
    )


async def send_otp_email(to_email: str, otp_code: str) -> None:
    """
    Send an OTP verification email via Resend.

    Raises RuntimeError if RESEND_API_KEY is not configured.
    Raises RuntimeError if the Resend API returns an error, so callers can
    surface the failure rather than silently succeeding with no email sent.
    """
    if not settings.resend_api_key:
        raise RuntimeError(
            "RESEND_API_KEY is not configured — cannot send verification email. "
            "Set it in .env and restart the server."
        )

    import resend  # imported here to avoid ImportError at startup if not installed

    resend.api_key = settings.resend_api_key

    params: resend.Emails.SendParams = {
        "from": _FROM_ADDRESS,
        "to": [to_email],
        "subject": _SUBJECT,
        "html": _build_email_html(otp_code),
        "text": _build_email_text(otp_code),
    }

    response = resend.Emails.send(params)

    # resend SDK raises on HTTP errors; if we get here, check for an error field
    # just in case an older SDK version returns instead of raising.
    if isinstance(response, dict) and response.get("error"):
        err = response["error"]
        logger.error("Resend API error: %s", err)
        raise RuntimeError(f"Email send failed: {err}")

    logger.info("OTP email sent to %s via Resend (id=%s)", to_email, getattr(response, "id", "?"))
