"""
Authentication router — server-side session approach.

Cookie: dpdp_session=<opaque UUID>  (httponly, samesite=lax)
Session data lives in the sessions table, not in the cookie.

Endpoints:
  POST /auth/register  — validate invite code, create user + session
  POST /auth/login     — verify password, create session
  POST /auth/logout    — delete session (instant revocation)
  GET  /auth/me        — validate session, return user + institution
"""

import bcrypt

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from typing import Optional

from config import settings
from db.pool import get_pool
from db import queries
from limiter import limiter
from schemas.auth import AuthResponse, InstitutionOut, LoginRequest, RegisterRequest, UserOut
from middleware.session import SESSION_COOKIE, clear_session_cookie_header

router = APIRouter(prefix="/auth", tags=["auth"])

# 7 days in seconds — aligns with SESSION_TTL_DAYS in queries.py
_COOKIE_MAX_AGE = 7 * 24 * 60 * 60


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


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(req: RegisterRequest, response: Response):
    """
    Register a new admin user.

    1. Validate that invite_code maps to a real institution.
    2. Check email is not already taken.
    3. Hash the password with bcrypt.
    4. Create the user row and a new session.
    5. Set the session cookie and return user + institution.
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

    # 4. Create user
    user_id = await queries.create_user_with_password(
        pool,
        display_name=req.admin_name,
        email=req.email,
        password_hash=pw_hash,
        institution_id=institution["id"],
    )

    # 5. Create session + set cookie
    session_id = await queries.create_session(pool, user_id)
    _set_session_cookie(response, session_id)

    user = await queries.get_user_by_id(pool, user_id)
    return _build_auth_response(user, institution)


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/15minutes")
async def login(request: Request, req: LoginRequest, response: Response):
    """
    Authenticate with email + password.

    Returns user + institution, sets a new session cookie.
    Generic error message for both "no such user" and "wrong password" to
    avoid leaking which emails exist.
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
        # Account was created without a password (e.g. dev-user) — cannot log in this way
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not bcrypt.checkpw(req.password.encode(), stored_hash.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
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
        # Orphaned session (user gone): the row was deleted in get_session; also
        # clear the now-useless cookie so the browser stops sending it.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
            headers=clear_session_cookie_header() if result.orphaned else None,
        )
    user_id = result.user_id

    user = await queries.get_user_by_id(pool, user_id)
    if user is None:
        # Defensive: get_session's JOIN already guarantees the user exists, so
        # this should be unreachable — kept as a belt-and-suspenders guard.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    institution = None
    if user["institution_id"]:
        institution = await queries.get_institution_by_id(pool, user["institution_id"])

    if institution is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Institution not found")

    return _build_auth_response(user, institution)
