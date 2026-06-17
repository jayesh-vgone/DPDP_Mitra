from functools import lru_cache
from config import settings
from .base import STTProvider
from .mock_stt import MockSTT
from .groq_stt import GroqSTT


@lru_cache(maxsize=1)
def get_stt_provider() -> STTProvider:
    if settings.stt_provider == "mock":
        return MockSTT()
    if settings.stt_provider == "groq":
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is required when STT_PROVIDER=groq")
        return GroqSTT(api_key=settings.groq_api_key, model=settings.groq_stt_model)
    raise ValueError(f"Unknown STT_PROVIDER: {settings.stt_provider!r}")
