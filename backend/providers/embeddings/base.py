from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed(self, texts: list[str], input_type: str) -> list[list[float]]:
        """
        Embed a list of texts.

        input_type must be either "search_document" (for ingestion)
        or "search_query" (for retrieval queries).
        """
        ...
