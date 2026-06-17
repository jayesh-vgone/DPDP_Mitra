#!/usr/bin/env python3
"""
Ingest DPDP Act PDFs into the dpdp_embeddings table.

Run from the backend/ directory:
    python scripts/ingest_dpdp.py

Re-runnable: uses upsert so existing chunks are updated, not duplicated.
Requires: EMBEDDING_PROVIDER=cohere + COHERE_API_KEY in .env
          DATABASE_URL pointing to a running PostgreSQL + pgvector instance
"""

import asyncio
import hashlib
import os
import re
import sys
import uuid
from pathlib import Path

# Allow imports from backend/ root
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
from PyPDF2 import PdfReader

from config import settings
from providers.embeddings.factory import get_embedding_provider

DOCS_DIR = Path(__file__).parent.parent / "docs"

# ── Startup diagnostics ───────────────────────────────────────────────────────
_env_path = (Path(__file__).parent.parent / ".env").resolve()
print(f"[diag] .env path : {_env_path}")
print(f"[diag] .env exists: {os.path.exists(_env_path)}")
_db_url = settings.database_url or "(not set)"
_masked_url = re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", _db_url)
print(f"[diag] DATABASE_URL: {_masked_url}")
# ─────────────────────────────────────────────────────────────────────────────

# Matches section/chapter headings in the DPDP Act gazette PDF.
# Captures: "Section 1", "SECTION 1", "1. Short title...", "CHAPTER I"
_HEADING = re.compile(
    r"(?:^|\n)"
    r"(?:"
    r"(?:SECTION|Section)\s+(\d+)"          # "Section 4" / "SECTION 4"
    r"|(\d{1,2})\.\s+[A-Z][A-Za-z\s,]{5,}"  # "4. Obligations of..."
    r"|(?:CHAPTER|Chapter)\s+[IVX\d]+"       # "CHAPTER II"
    r")",
    re.MULTILINE,
)


def _extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    return "\n".join(pages)


def _chunk_text(text: str, source: str) -> list[dict]:
    """Split PDF text on section/chapter boundaries and label each chunk."""
    # Normalise line endings and collapse excessive blank lines
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Find all heading positions
    matches = list(_HEADING.finditer(text))

    if not matches:
        # Fallback: treat entire document as one chunk
        return [{"section": "General", "content": text.strip(), "source": source}]

    chunks: list[dict] = []

    # Text before the first heading (preamble/title)
    preamble = text[: matches[0].start()].strip()
    if len(preamble) > 100:
        chunks.append({"section": "Preamble", "content": preamble, "source": source})

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunk_text = text[start:end].strip()

        if len(chunk_text) < 80:
            continue  # skip lone headings / page noise

        # Derive a clean section label from the heading line
        heading_line = chunk_text.split("\n")[0].strip()
        # Trim trailing punctuation clutter
        section_label = re.sub(r"[.\-–—]+$", "", heading_line).strip()
        if len(section_label) > 80:
            section_label = section_label[:80]

        chunks.append({"section": section_label, "content": chunk_text, "source": source})

    return chunks


def _chunk_id(section: str, source: str) -> str:
    """Deterministic UUID so re-runs upsert instead of duplicate-insert."""
    key = f"{source}::{section}".encode()
    digest = hashlib.sha256(key).hexdigest()
    return str(uuid.UUID(digest[:32]))


def _vec_str(vec: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"


async def _ensure_schema(conn: asyncpg.Connection) -> None:
    await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS dpdp_embeddings (
            id      UUID PRIMARY KEY,
            section TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1024)
        );
        """
    )


async def _upsert_chunks(
    conn: asyncpg.Connection,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> None:
    for chunk, vec in zip(chunks, embeddings):
        row_id = _chunk_id(chunk["section"], chunk["source"])
        vec_str = _vec_str(vec)
        await conn.execute(
            """
            INSERT INTO dpdp_embeddings (id, section, content, embedding)
            VALUES ($1, $2, $3, $4::vector)
            ON CONFLICT (id) DO UPDATE
                SET content   = EXCLUDED.content,
                    embedding  = EXCLUDED.embedding;
            """,
            row_id,
            chunk["section"],
            chunk["content"],
            vec_str,
        )


async def _build_index(conn: asyncpg.Connection, n_chunks: int) -> None:
    lists = max(1, min(100, int(n_chunks ** 0.5)))
    await conn.execute("DROP INDEX IF EXISTS dpdp_embeddings_embedding_idx;")
    await conn.execute(
        f"""
        CREATE INDEX dpdp_embeddings_embedding_idx
        ON dpdp_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = {lists});
        """
    )


async def main() -> None:
    if settings.embedding_provider == "mock":
        print(
            "WARNING: EMBEDDING_PROVIDER=mock — embeddings will be random.\n"
            "Switch to EMBEDDING_PROVIDER=cohere for useful retrieval."
        )

    if not settings.database_url:
        print("ERROR: DATABASE_URL is not set in .env — cannot connect to PostgreSQL.")
        sys.exit(1)

    pdf_files = sorted(DOCS_DIR.glob("*.pdf"))
    if not pdf_files:
        print(
            f"No PDFs found in {DOCS_DIR}.\n"
            "Please add source documents (e.g. dpdp_act.pdf) to backend/docs/ and re-run."
        )
        sys.exit(1)

    embedder = get_embedding_provider()
    conn = await asyncpg.connect(settings.database_url)

    try:
        await _ensure_schema(conn)

        total_chunks = 0

        for pdf_path in pdf_files:
            print(f"\nIngesting {pdf_path.name}...")
            text = _extract_text(pdf_path)
            chunks = _chunk_text(text, pdf_path.name)
            print(f"  {len(chunks)} chunks detected — embedding...", end=" ", flush=True)

            # Embed in one batch (Cohere allows up to 96 texts per call)
            batch_size = 90
            all_vecs: list[list[float]] = []
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i : i + batch_size]
                vecs = await embedder.embed(
                    [c["content"] for c in batch],
                    input_type="search_document",
                )
                all_vecs.extend(vecs)

            await _upsert_chunks(conn, chunks, all_vecs)
            print(f"{len(chunks)} embeddings stored.")
            total_chunks += len(chunks)

        print(f"\nBuilding IVFFlat index on {total_chunks} chunks...")
        await _build_index(conn, total_chunks)

        print(
            f"\nIngestion complete.\n"
            f"  Documents processed : {len(pdf_files)}\n"
            f"  Total chunks stored : {total_chunks}\n"
        )

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
