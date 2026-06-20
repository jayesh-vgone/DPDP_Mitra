from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from jose import jwt, JWTError

from config import settings

SKIP_PATHS = {"/health"}
# /auth/* and /admin/* routes use their own session-cookie mechanisms and must
# not require a JWT (admin has a fully separate session realm — see
# middleware/admin_session.py).
SKIP_PREFIXES = ("/auth/", "/admin/")


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in SKIP_PATHS:
            return await call_next(request)
        if any(request.url.path.startswith(p) for p in SKIP_PREFIXES):
            return await call_next(request)

        if settings.app_env == "development":
            request.state.user_id = "dev-user-001"
            return await call_next(request)

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return JSONResponse(
                {"detail": "Missing or invalid Authorization header"}, status_code=401
            )

        token = auth.split(" ", 1)[1]
        try:
            payload = jwt.decode(
                token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
            )
            user_id = payload.get("sub") or payload.get("user_id")
            if not user_id:
                raise JWTError("No user_id claim in token")
            request.state.user_id = str(user_id)
        except JWTError:
            return JSONResponse(
                {"detail": "Invalid or expired token"}, status_code=401
            )

        return await call_next(request)
