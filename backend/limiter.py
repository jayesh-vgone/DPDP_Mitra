"""
Shared rate-limiter instance for slowapi.

Deployment note (DEPLOY.md): the recommended setup routes browsers through
Vercel's `/api/*` rewrite → Render, so `request.client.host` would be Vercel's
egress IP — useless as a rate-limit key.  `X-Forwarded-For` is populated by
Vercel with the real client IP and is used here instead.

Falls back to `request.client.host` for local dev where no proxy is present.
"""

from slowapi import Limiter


def _get_client_ip(request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    host = request.client.host if request.client else "unknown"
    return host


limiter = Limiter(key_func=_get_client_ip)
