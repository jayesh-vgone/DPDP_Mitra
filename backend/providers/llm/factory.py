from functools import lru_cache
from config import settings
from .base import LLMProvider
from .mock_llm import MockLLM
from .groq_llm import GroqLLM


@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "mock":
        return MockLLM()
    if settings.llm_provider == "groq":
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is required when LLM_PROVIDER=groq")
        return GroqLLM(api_key=settings.groq_api_key, model=settings.groq_llm_model)
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider!r}")
