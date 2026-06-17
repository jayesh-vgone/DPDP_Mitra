import math
import random

from .base import EmbeddingProvider

DIM = 1024


class MockEmbedding(EmbeddingProvider):
    """Returns normalised random 1024-dim vectors — useful for wiring tests only."""

    async def embed(self, texts: list[str], input_type: str) -> list[list[float]]:
        results: list[list[float]] = []
        for _ in texts:
            vec = [random.gauss(0, 1) for _ in range(DIM)]
            norm = math.sqrt(sum(v * v for v in vec)) or 1.0
            results.append([v / norm for v in vec])
        return results
