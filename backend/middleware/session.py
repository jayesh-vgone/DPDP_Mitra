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
from typing import Optional

from db.pool import get_pool
from db import queries


SESSION_COOKIE = "dpdp_session"


async def get_session_user(
    session_id: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
) -> str:
    """
    Read the session cookie, validate against the sessions table, and return
    the user_id. Raises HTTP 401 if cookie is missing or session is expired.

    The session's expires_at is bumped forward on every call (sliding window),
    so active users stay logged in without having to re-authenticate.
    """
    if session_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    pool = get_pool()
    user_id = await queries.get_session(pool, session_id)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

    return user_id
