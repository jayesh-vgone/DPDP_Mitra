from functools import lru_cache

from config import settings

from .base import EmbeddingProvider
from .mock_embed import MockEmbedding
from .cohere_embed import CohereEmbedding


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    if settings.embedding_provider == "mock":
        return MockEmbedding()
    if settings.embedding_provider == "cohere":
        if not settings.cohere_api_key:
            raise ValueError("COHERE_API_KEY is required when EMBEDDING_PROVIDER=cohere")
        return CohereEmbedding(api_key=settings.cohere_api_key)
    raise ValueError(f"Unknown EMBEDDING_PROVIDER: {settings.embedding_provider!r}")
