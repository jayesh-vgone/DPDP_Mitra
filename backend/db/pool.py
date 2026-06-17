"""
Shared asyncpg connection pool.

Initialized once at FastAPI startup (lifespan) and closed cleanly on shutdown.
All routers acquire connections from this pool via `get_pool()` rather than
opening per-request connections, which keeps latency low.
"""

import asyncpg

from config import settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    if not settings.database_url:
        print("[db] DATABASE_URL not set — pool not initialized")
        return
    _pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=2,
        max_size=10,
    )
    print("[db] connection pool ready")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        print("[db] connection pool closed")


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool is not initialized — check DATABASE_URL in .env")
    return _pool
