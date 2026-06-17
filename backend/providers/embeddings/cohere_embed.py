import cohere

from .base import EmbeddingProvider

MODEL = "embed-multilingual-v3.0"


class CohereEmbedding(EmbeddingProvider):
    """Cohere embed-multilingual-v3.0 — 1024 dims, handles Hindi + English natively."""

    def __init__(self, api_key: str) -> None:
        self._client = cohere.AsyncClientV2(api_key=api_key)

    async def embed(self, texts: list[str], input_type: str) -> list[list[float]]:
        response = await self._client.embed(
            texts=texts,
            model=MODEL,
            input_type=input_type,
            embedding_types=["float"],
        )
        return response.embeddings.float_  # type: ignore[return-value]
