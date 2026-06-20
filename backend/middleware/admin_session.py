"""
FastAPI dependency that resolves the current admin from an admin session cookie.

Deliberately separate from middleware/session.py (institution users):
  - different cookie name      : admin_session  (vs dpdp_session)
  - different backing table     : admin_sessions (vs sessions)
  - different dependency        : get_current_admin (vs get_session_user)

This separation lets an institution user and an admin be logged in at the same
time in one browser without their cookies colliding. Use get_current_admin to
protect every /admin/* route (except login).

    @router.get("/admin/questions")
    async def list_qs(admin_id: str = Depends(get_current_admin)):
        ...
"""

from fastapi import Cookie, HTTPException, status
from typing import Optional

from db.pool import get_pool
from db import queries


ADMIN_SESSION_COOKIE = "admin_session"


async def get_current_admin(
    admin_session: Optional[str] = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
) -> str:
    """
    Read the admin session cookie, validate against admin_sessions, and return
    the admin_id. Raises 401 if the cookie is missing or the session is invalid.
    Sliding expiry is bumped on every call, like institution sessions.
    """
    if admin_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required",
        )

    pool = get_pool()
    admin_id = await queries.get_admin_session(pool, admin_session)
    if admin_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session expired or invalid",
        )

    return admin_id
