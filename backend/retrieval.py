"""
RAG retrieval — embed user query and fetch top-K similar DPDP chunks from pgvector.

Returns an empty list (silently) if DATABASE_URL is not configured so the
server keeps working without a DB during early development.
"""

import asyncpg

from config import settings
from providers.embeddings.factory import get_embedding_provider


def _vec_str(vec: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"


async def retrieve_chunks(query: str, k: int = 5) -> list[dict[str, str]]:
    """Return top-k dpdp_embeddings rows most similar to *query*."""
    if not settings.database_url:
        return []

    try:
        embedder = get_embedding_provider()
        vecs = await embedder.embed([query], input_type="search_query")
        query_vec_str = _vec_str(vecs[0])

        conn = await asyncpg.connect(settings.database_url)
        try:
            rows = await conn.fetch(
                """
                SELECT section, content
                FROM dpdp_embeddings
                ORDER BY embedding <=> $1::vector
                LIMIT $2
                """,
                query_vec_str,
                k,
            )
        finally:
            await conn.close()

        return [{"section": r["section"], "content": r["content"]} for r in rows]

    except Exception as exc:
        print(f"[retrieval] Skipping RAG — DB unavailable: {exc}")
        return []
