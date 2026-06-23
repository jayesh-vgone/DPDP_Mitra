"""
FastAPI dependency that resolves user_id from a session cookie.

This is the Phase 5 replacement for request.state.user_id (which was set by
the JWT dev-bypass in AuthMiddleware). The JWT middleware itself is left
completely untouched — it handles a separate future use-case (third-party app
auth via Bearer token). This dependency is what /chat, /voice, and /conversations*
now Depends() on.

Usage in a route:
    @router.post("/chat")
    async def chat(req: ChatRequest, user_id: str = Depends(get_session_user)):
        ...
"""

from fastapi import Cookie, Depends, HTTPException, status
from starlette.responses import Response as StarletteResponse
from typing import Optional

from config import settings
from db.pool import get_pool
from db import queries


SESSION_COOKIE = "dpdp_session"


def clear_session_cookie_header() -> dict[str, str]:
    """
    Build a Set-Cookie header that deletes the session cookie, mirroring the
    attributes it was set with (see auth._set_session_cookie) so the browser
    matches and removes it.

    Used when raising a 401 for an *orphaned* session: cookies set on an
    injected Response are dropped once HTTPException short-circuits the
    response, so the clear must travel on the exception's own headers instead.
    """
    tmp = StarletteResponse()
    tmp.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
    )
    return {"set-cookie": tmp.headers["set-cookie"]}


async def get_session_user(
    session_id: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
) -> str:
    """
    Read the session cookie, validate against the sessions table, and return
    the user_id. Raises HTTP 401 if the cookie is missing, the session is
    expired, or the referenced user no longer exists.

    Validation requires the user to still exist (JOIN in queries.get_session),
    not just the session row — so a session can't outlive its user. If the
    session was orphaned (live row, missing user), the orphan row is deleted
    in get_session and we additionally clear the client's cookie here.

    The session's expires_at is bumped forward on every call (sliding window),
    so active users stay logged in without having to re-authenticate.
    """
    if session_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    pool = get_pool()
    result = await queries.get_session(pool, session_id)

    if result.valid:
        return result.user_id

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired or invalid",
        headers=clear_session_cookie_header() if result.orphaned else None,
    )
