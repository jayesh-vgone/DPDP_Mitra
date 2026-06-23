"""
Multi-document-type ingestion pipeline.

Walks backend/docs/act/ and backend/docs/case_law/, selects the right chunker
per folder, embeds with Cohere, and upserts into dpdp_embeddings.

Idempotency: chunks whose extracted text is byte-identical to the stored content
are NOT re-embedded — Cohere API quota is not wasted on unchanged chunks. Only
new or changed chunks are embedded and upserted.

Called by scripts/ingest_dpdp.py.
"""

import hashlib
import logging
import os
import re
import sys
import uuid
from pathlib import Path

import asyncpg

from config import settings
from ingestion.chunkers import BaseChunker, StatuteChunker, CaseLawChunker
from providers.embeddings.factory import get_embedding_provider

logger = logging.getLogger(__name__)

DOCS_ROOT = Path(__file__).parent.parent / "docs"

# folder name → chunker class, doc_type tag, optional fixed title override
_FOLDER_CONFIG: dict[str, dict] = {
    "act": {
        "chunker_cls": StatuteChunker,
        "doc_type": "act",
        "fixed_title": "The Digital Personal Data Protection Act, 2023",
    },
    "case_law": {
        "chunker_cls": CaseLawChunker,
        "doc_type": "case_law",
        "fixed_title": None,  # extracted per-file by CaseLawChunker
    },
}


# ── Chunk ID ─────────────────────────────────────────────────────────────────

def _chunk_id(source_filename: str, section: str | None, fallback_index: int | None = None) -> str:
    """
    Deterministic UUID for upsert keying — stable across re-runs.

    For paragraph-labelled chunks:  key = "{filename}::{section}"
    For fixed-size fallback chunks: key = "{filename}::chunk_{index}"

    Matches the formula used by the original ingest_dpdp.py so existing DPDP Act
    rows are correctly identified and updated (or skipped) rather than duplicated.
    """
    if section is not None:
        key = f"{source_filename}::{section}".encode()
    else:
        key = f"{source_filename}::chunk_{fallback_index}".encode()
    digest = hashlib.sha256(key).hexdigest()
    return str(uuid.UUID(digest[:32]))


def _vec_str(vec: list[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _fetch_existing(conn: asyncpg.Connection, source_filename: str) -> dict[str, str]:
    """Return {chunk_id_str: content} for all stored chunks from source_filename."""
    rows = await conn.fetch(
        "SELECT id::text, content FROM dpdp_embeddings WHERE source_filename = $1",
        source_filename,
    )
    return {str(r["id"]): r["content"] for r in rows}


async def _upsert(
    conn: asyncpg.Connection,
    chunk: dict,
    vec: list[float],
    doc_type: str,
    source_filename: str,
    doc_title: str,
    row_id: str,
) -> None:
    await conn.execute(
        """
        INSERT INTO dpdp_embeddings
            (id, section, content, embedding, doc_type, source_filename, doc_title)
        VALUES ($1, $2, $3, $4::vector, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
            SET content         = EXCLUDED.content,
                embedding       = EXCLUDED.embedding,
                doc_type        = EXCLUDED.doc_type,
                source_filename = EXCLUDED.source_filename,
                doc_title       = EXCLUDED.doc_title;
        """,
        row_id,
        chunk["section"],
        chunk["content"],
        _vec_str(vec),
        doc_type,
        source_filename,
        doc_title,
    )


async def _rebuild_index(conn: asyncpg.Connection, total_chunks: int) -> None:
    await conn.execute("DROP INDEX IF EXISTS dpdp_embeddings_embedding_idx;")
    if total_chunks < 100:
        print(f"  Skipping vector index ({total_chunks} chunks < 100 — sequential scan is faster).")
        return
    # Supabase free-tier caps maintenance_work_mem at 32 MB by default.
    # Bump it for this session so the IVFFlat build has enough memory.
    try:
        await conn.execute("SET maintenance_work_mem = '64MB'")
    except Exception:
        pass  # no-op if the server doesn't allow it; build will fail gracefully below
    lists = max(1, min(100, int(total_chunks ** 0.5)))
    await conn.execute(
        f"""
        CREATE INDEX dpdp_embeddings_embedding_idx
        ON dpdp_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = {lists});
        """
    )


# ── Per-file ingestion ────────────────────────────────────────────────────────

async def _ingest_file(
    conn: asyncpg.Connection,
    embedder,
    pdf_path: Path,
    folder_name: str,
    config: dict,
) -> int:
    """Ingest one PDF. Returns total chunk count for that file."""
    chunker: BaseChunker = config["chunker_cls"]()
    doc_type: str = config["doc_type"]
    source_filename = pdf_path.name

    try:
        chunks, doc_title = chunker.chunk(pdf_path)
    except Exception as exc:
        logger.error("Failed to chunk %s: %s — skipping.", pdf_path.name, exc)
        print(f"  ERROR chunking {pdf_path.name}: {exc} — skipping.")
        return 0

    if config["fixed_title"]:
        doc_title = config["fixed_title"]

    print(f"  {len(chunks)} chunks detected — checking for changes...", end=" ", flush=True)

    # Compute IDs for all chunks and compare against stored content.
    existing = await _fetch_existing(conn, source_filename)

    needs_embed: list[tuple[int, str]] = []  # (chunk_index, row_id)
    for idx, chunk in enumerate(chunks):
        row_id = _chunk_id(source_filename, chunk.get("section"), chunk.get("_fallback_index", idx))
        if row_id in existing and existing[row_id] == chunk["content"]:
            continue  # unchanged — skip embedding and upsert
        needs_embed.append((idx, row_id))

    skipped = len(chunks) - len(needs_embed)
    if skipped == len(chunks):
        print(f"all {len(chunks)} chunks unchanged — no re-embedding needed.")
    elif skipped:
        print(f"{skipped} unchanged, {len(needs_embed)} new/updated — embedding...")
    else:
        print(f"all {len(chunks)} new or updated — embedding...")

    if needs_embed:
        batch_size = 90
        indices_to_embed = [i for i, _ in needs_embed]
        row_ids = {i: rid for i, rid in needs_embed}
        chunks_to_embed = [chunks[i] for i in indices_to_embed]

        all_vecs: list[list[float]] = []
        for b_start in range(0, len(chunks_to_embed), batch_size):
            batch = chunks_to_embed[b_start : b_start + batch_size]
            vecs = await embedder.embed(
                [c["content"] for c in batch],
                input_type="search_document",
            )
            all_vecs.extend(vecs)

        for (orig_idx, row_id), vec in zip(needs_embed, all_vecs):
            await _upsert(conn, chunks[orig_idx], vec, doc_type, source_filename, doc_title, row_id)

    print(f"  Done — {len(chunks)} chunks stored ({skipped} unchanged, {len(needs_embed)} updated).")
    return len(chunks)


# ── Entry point ───────────────────────────────────────────────────────────────

async def run() -> None:
    """Main entry point. Called by scripts/ingest_dpdp.py."""
    _db_url = settings.database_url or "(not set)"
    _masked = re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", _db_url)
    _env_path = (Path(__file__).parent.parent / ".env").resolve()
    print(f"[diag] .env path : {_env_path}")
    print(f"[diag] .env exists: {os.path.exists(_env_path)}")
    print(f"[diag] DATABASE_URL: {_masked}")

    if settings.embedding_provider == "mock":
        print(
            "WARNING: EMBEDDING_PROVIDER=mock — embeddings will be random.\n"
            "Switch to EMBEDDING_PROVIDER=cohere for useful retrieval."
        )

    if not settings.database_url:
        print("ERROR: DATABASE_URL is not set in .env — cannot connect to PostgreSQL.")
        sys.exit(1)

    # Discover PDFs per folder.
    found: dict[str, list[Path]] = {}
    for folder_name in _FOLDER_CONFIG:
        folder = DOCS_ROOT / folder_name
        found[folder_name] = sorted(folder.glob("*.pdf")) if folder.exists() else []

    act_count = len(found.get("act", []))
    case_count = len(found.get("case_law", []))

    if act_count == 0 and case_count == 0:
        print(
            f"No PDFs found in {DOCS_ROOT}/act/ or {DOCS_ROOT}/case_law/.\n"
            "Please add source documents and re-run."
        )
        sys.exit(1)

    embedder = get_embedding_provider()

    conn = await asyncpg.connect(settings.database_url)
    try:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")

        total_chunks = 0
        per_type: dict[str, dict] = {}

        for folder_name, pdf_list in found.items():
            config = _FOLDER_CONFIG[folder_name]
            per_type[folder_name] = {"docs": len(pdf_list), "chunks": 0}

            if not pdf_list:
                continue  # empty case_law folder is not an error

            for pdf_path in pdf_list:
                print(f"\nIngesting {folder_name}/{pdf_path.name} [{config['doc_type']}]...")
                n = await _ingest_file(conn, embedder, pdf_path, folder_name, config)
                per_type[folder_name]["chunks"] += n
                total_chunks += n

        total_docs = sum(v["docs"] for v in per_type.values())
        print(f"\nBuilding IVFFlat index on {total_chunks} total chunks...")
        await _rebuild_index(conn, total_chunks)

        print("\nIngestion complete.")
        for folder_name, counts in per_type.items():
            if counts["docs"] > 0:
                print(f"  {folder_name:<10} : {counts['docs']} doc(s), {counts['chunks']} chunk(s)")
        print(f"  {'TOTAL':<10} : {total_docs} doc(s), {total_chunks} chunk(s)")

    finally:
        await conn.close()
