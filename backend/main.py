from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from middleware.auth import AuthMiddleware
from routers import health, chat, voice, conversations, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly validate provider config at startup so misconfiguration fails fast.
    from providers.llm.factory import get_llm_provider
    from providers.stt.factory import get_stt_provider
    from providers.tts.factory import get_tts_provider
    from providers.embeddings.factory import get_embedding_provider
    get_llm_provider()
    get_stt_provider()
    get_tts_provider()
    get_embedding_provider()

    # Initialize the shared DB connection pool.
    # All routers acquire connections from this pool rather than opening
    # per-request connections — avoids the ~10 ms TCP handshake per request.
    from db.pool import init_pool, close_pool
    await init_pool()

    yield

    await close_pool()


app = FastAPI(title="DPDP Mitra API", version="2.0.0", lifespan=lifespan)

_cors_origins = [o.strip() for o in settings.cors_origins.split(",")]
print(f"[startup] CORS origins: {_cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(conversations.router)
