"""
Authentication router — server-side session approach.

Cookie: dpdp_session=<opaque UUID>  (httponly, samesite=lax)
Session data lives in the sessions table, not in the cookie.

Endpoints:
  POST /auth/register    — validate invite code, create user, send OTP; NO session issued
  POST /auth/verify-otp  — verify 6-digit OTP, mark email verified, issue session
  POST /auth/resend-otp  — resend OTP (60-second cooldown)
  POST /auth/login       — verify password + email_verified, create session
  POST /auth/logout      — delete session (instant revocation)
  GET  /auth/me          — validate session, return user + institution

Email OTP flow (registration):
  1. register  → user row created (email_verified=false), OTP sent, NO session
  2. verify-otp → OTP checked, email_verified=true, session created, cookie set
  3. login (returning user) → password + email_verified check, session created

If a user registers but never verifies, login is blocked until they verify.
"""

import hashlib
import logging
import random
import string

import bcrypt

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from typing import Optional

from config import settings
from db.pool import get_pool
from db import queries
from limiter import limiter
from providers.email_sender import send_otp_email
from schemas.auth import (
    AuthResponse,
    InstitutionOut,
    LoginRequest,
    RegisterPendingResponse,
    RegisterRequest,
    ResendOtpRequest,
    UserOut,
    VerifyOtpRequest,
)
from middleware.session import SESSION_COOKIE, clear_session_cookie_header

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# 7 days in seconds — aligns with SESSION_TTL_DAYS in queries.py
_COOKIE_MAX_AGE = 7 * 24 * 60 * 60


# ── Helpers ────────────────────────────────────────────────────────────────────

def _set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


def _build_auth_response(user: dict, institution: dict) -> AuthResponse:
    return AuthResponse(
        user=UserOut(**user),
        institution=InstitutionOut(**institution),
    )


def _generate_otp() -> str:
    """Return a random 6-digit numeric OTP string."""
    return "".join(random.choices(string.digits, k=6))


def _hash_otp(otp: str) -> str:
    """SHA-256 hash of the OTP (fast, sufficient given short expiry + attempt limiting)."""
    return hashlib.sha256(otp.encode()).hexdigest()


# ── Register ───────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(req: RegisterRequest, response: Response):
    """
    Register a new admin user.

    When EMAIL_VERIFICATION_ENABLED=true (production):
      1. Validate invite code, check email uniqueness, hash password.
      2. Create user with email_verified=false.
      3. Generate 6-digit OTP, store hash, send via Resend.
      4. Return RegisterPendingResponse — NO session issued.
      The client redirects to /verify-otp?email=<email>.

    When EMAIL_VERIFICATION_ENABLED=false (current default):
      Steps 1-3 are the same except email_verified is set to true immediately.
      A session is issued and a cookie is set — user lands straight in the dashboard.
      Returns AuthResponse (same shape as login).
    """
    pool = get_pool()

    # 1. Validate invite code
    institution = await queries.get_institution_by_invite_code(pool, req.invite_code)
    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite code",
        )

    # 2. Check email uniqueness
    existing = await queries.get_user_by_email(pool, req.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # 3. Hash password
    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()

    # 4. Create user (email_verified defaults to false in the DB)
    user_id = await queries.create_user_with_password(
        pool,
        display_name=req.admin_name,
        email=req.email,
        password_hash=pw_hash,
        institution_id=institution["id"],
    )

    if not settings.email_verification_enabled:
        # Flag is off — mark verified immediately and issue a session so the
        # user lands in the dashboard without visiting /verify-otp.
        await queries.set_email_verified(pool, user_id)
        fresh_user = await queries.get_user_by_id(pool, user_id)
        session_id = await queries.create_session(pool, user_id)
        _set_session_cookie(response, session_id)
        return _build_auth_response(fresh_user, institution)

    # 5. Generate OTP, send email (only reached when flag is true)
    otp_code = _generate_otp()
    otp_hash = _hash_otp(otp_code)
    await queries.create_otp(pool, user_id, "registration", otp_hash)

    try:
        await send_otp_email(to_email=req.email, otp_code=otp_code)
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", req.email, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Account created but we could not send your verification email. "
                "Please use 'Resend code' on the verification screen."
            ),
        )

    # 6. Return pending response (no session, no cookie)
    return RegisterPendingResponse(email=req.email)


# ── Verify OTP ─────────────────────────────────────────────────────────────────

@router.post("/verify-otp", response_model=AuthResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, req: VerifyOtpRequest, response: Response):
    """
    Verify the 6-digit OTP.
    Returns a 200 informational response when EMAIL_VERIFICATION_ENABLED=false.

    On success: mark email_verified=true, create a session, set cookie, return
    the full AuthResponse so the client can redirect straight into the dashboard.

    Error cases:
    - No live OTP found (expired or never sent): 400 CODE_EXPIRED
    - Too many wrong attempts (>=5): OTP invalidated, 400 TOO_MANY_ATTEMPTS
    - Wrong code: attempts incremented, 400 INVALID_OTP (includes remaining count)
    """
    if not settings.email_verification_enabled:
        return JSONResponse(
            status_code=200,
            content={"message": "Email verification is currently disabled."},
        )

    pool = get_pool()

    user = await queries.get_user_by_email(pool, req.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CODE_EXPIRED",
        )

    if user.get("email_verified"):
        # Already verified — treat as success; client can redirect to login
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ALREADY_VERIFIED",
        )

    otp_row = await queries.get_live_otp(pool, user["id"], "registration")
    if otp_row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CODE_EXPIRED",
        )

    # Check attempt limit BEFORE comparing (so the 6th attempt is blocked even
    # if the user finally typed the correct code).
    if otp_row["attempts_count"] >= queries.OTP_MAX_ATTEMPTS:
        await queries.invalidate_otp(pool, otp_row["id"])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOO_MANY_ATTEMPTS",
        )

    submitted_hash = _hash_otp(req.otp)
    if submitted_hash != otp_row["otp_hash"]:
        new_count = await queries.increment_otp_attempts(pool, otp_row["id"])
        remaining = queries.OTP_MAX_ATTEMPTS - new_count
        if remaining <= 0:
            await queries.invalidate_otp(pool, otp_row["id"])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TOO_MANY_ATTEMPTS",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"INVALID_OTP:{remaining}",
        )

    # Correct code — consume OTP, mark email verified, create session
    await queries.consume_otp(pool, otp_row["id"])
    await queries.set_email_verified(pool, user["id"])

    institution = None
    if user.get("institution_id"):
        institution = await queries.get_institution_by_id(pool, user["institution_id"])

    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Institution not found for this account",
        )

    session_id = await queries.create_session(pool, user["id"])
    _set_session_cookie(response, session_id)

    # Refresh user dict so email_verified = True is reflected in the response
    fresh_user = await queries.get_user_by_id(pool, user["id"])
    return _build_auth_response(fresh_user, institution)


# ── Resend OTP ─────────────────────────────────────────────────────────────────

@router.post("/resend-otp", status_code=200)
@limiter.limit("5/hour")
async def resend_otp(request: Request, req: ResendOtpRequest):
    """
    Resend a verification OTP.

    Enforces a 60-second per-user cooldown based on the created_at of the most
    recent OTP row (consumed or not, expired or not).

    Returns: { "message": "...", "retry_after_seconds": <int> }
    The client uses retry_after_seconds to drive a countdown timer.
    Returns a 200 informational response when EMAIL_VERIFICATION_ENABLED=false.
    """
    if not settings.email_verification_enabled:
        return JSONResponse(
            status_code=200,
            content={"message": "Email verification is currently disabled."},
        )

    from datetime import timezone as _tz
    from datetime import datetime as _dt

    pool = get_pool()

    user = await queries.get_user_by_email(pool, req.email)
    if user is None:
        # Do not leak whether the address is registered
        return {"message": "If this email is registered, a new code has been sent."}

    if user.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ALREADY_VERIFIED",
        )

    # Cooldown check
    last_created = await queries.get_latest_otp_created_at(pool, user["id"], "registration")
    if last_created is not None:
        elapsed = (_dt.now(_tz.utc) - last_created).total_seconds()
        if elapsed < queries.OTP_RESEND_COOLDOWN_SECONDS:
            retry_after = int(queries.OTP_RESEND_COOLDOWN_SECONDS - elapsed) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"COOLDOWN:{retry_after}",
            )

    # Generate and send new OTP (create_otp invalidates any prior live one)
    otp_code = _generate_otp()
    otp_hash = _hash_otp(otp_code)
    await queries.create_otp(pool, user["id"], "registration", otp_hash)

    try:
        await send_otp_email(to_email=req.email, otp_code=otp_code)
    except Exception as exc:
        logger.error("Failed to resend OTP email to %s: %s", req.email, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not send verification email. Please try again in a moment.",
        )

    return {
        "message": "Verification code sent.",
        "retry_after_seconds": queries.OTP_RESEND_COOLDOWN_SECONDS,
    }


# ── Login ──────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/15minutes")
async def login(request: Request, req: LoginRequest, response: Response):
    """
    Authenticate with email + password.

    Blocks with EMAIL_NOT_VERIFIED (403) if the account exists and the password
    is correct but the email has not been verified. This is intentionally a
    distinct error so the frontend can route to /verify-otp rather than showing
    a generic "wrong password" message.

    Returns user + institution, sets a new session cookie on success.
    """
    pool = get_pool()

    user = await queries.get_user_by_email(pool, req.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    stored_hash = user.get("password_hash")
    if not stored_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not bcrypt.checkpw(req.password.encode(), stored_hash.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Password is correct — check email verification (only when flag is on)
    if settings.email_verification_enabled and not user.get("email_verified", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )

    institution = None
    if user["institution_id"]:
        institution = await queries.get_institution_by_id(pool, user["institution_id"])

    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Institution not found for this account",
        )

    session_id = await queries.create_session(pool, user["id"])
    _set_session_cookie(response, session_id)

    return _build_auth_response(user, institution)


# ── Logout ─────────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    session_id: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
):
    """
    Delete the session row (instant revocation) and clear the cookie.

    Idempotent — safe to call even if the session is already expired/gone.
    """
    if session_id:
        pool = get_pool()
        await queries.delete_session(pool, session_id)

    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
    )


# ── Me ─────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=AuthResponse)
async def me(
    session_id: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
):
    """
    Validate the current session and return user + institution.

    The session's expires_at is bumped forward (sliding window) by get_session().
    Returns 401 if no cookie or session is expired — the frontend uses this to
    determine whether to redirect to /login.
    """
    if session_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    pool = get_pool()
    result = await queries.get_session(pool, session_id)
    if not result.valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
            headers=clear_session_cookie_header() if result.orphaned else None,
        )
    user_id = result.user_id

    user = await queries.get_user_by_id(pool, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    institution = None
    if user["institution_id"]:
        institution = await queries.get_institution_by_id(pool, user["institution_id"])

    if institution is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Institution not found")

    return _build_auth_response(user, institution)
