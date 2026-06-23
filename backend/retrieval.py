"""
RAG retrieval — embed user query and fetch top-K similar chunks from pgvector.

Returns an empty list (silently) if DATABASE_URL is not configured so the
server keeps working without a DB during early development.

Each returned chunk dict includes section, content, doc_type, source_filename,
doc_title, AND similarity_score (cosine distance, lower = more similar).

The similarity score is used in prompts.py to apply the case-law relevance gate
(CASE_LAW_RELEVANCE_THRESHOLD) before inserting chunks into the LLM prompt.
"""

import asyncpg

from config import settings
from providers.embeddings.factory import get_embedding_provider

# ── Case-law relevance gate ───────────────────────────────────────────────────
#
# pgvector's <=> operator returns cosine DISTANCE (0 = identical, 1 = orthogonal).
# A case-law chunk only enters the LLM prompt if its distance is below this
# threshold — Act chunks are always included regardless of their score.
#
# Calibrated 2026-06-24 against 9 real case-law judgments (452 total chunks).
# Relevant case-law chunks (Puttaswamy proportionality/privacy) scored 0.29–0.40.
# Borderline/irrelevant chunks scored 0.47+ across 7 test queries.
# Natural gap between 0.40 (highest relevant) and 0.47 (lowest borderline) → 0.42.
# Reasonable for v1; revisit if real usage surfaces miscalibration.
CASE_LAW_RELEVANCE_THRESHOLD: float = 0.42


def _vec_str(vec: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"


async def retrieve_chunks(query: str, k: int = 5) -> list[dict]:
    """
    Return top-k dpdp_embeddings rows most similar to *query*.

    Retrieval is a single ranked query across ALL doc_types — relevance (not
    doc_type) drives the result set. Case-law relevance filtering happens in
    prompts.py using the similarity_score returned here.
    """
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
                SELECT section, content, doc_type, source_filename, doc_title,
                       (embedding <=> $1::vector) AS similarity_score
                FROM dpdp_embeddings
                ORDER BY similarity_score
                LIMIT $2
                """,
                query_vec_str,
                k,
            )
        finally:
            await conn.close()

        return [
            {
                "section":          r["section"],
                "content":          r["content"],
                "doc_type":         r["doc_type"] or "act",
                "source_filename":  r["source_filename"],
                "doc_title":        r["doc_title"],
                "similarity_score": float(r["similarity_score"]),
            }
            for r in rows
        ]

    except Exception as exc:
        print(f"[retrieval] Skipping RAG — DB unavailable: {exc}")
        return []
