"""
Chunking strategies for different document types.

StatuteChunker  — DPDP Act and other statutes: splits on Section/Chapter headings.
                  Logic extracted verbatim from the original ingest_dpdp.py.
CaseLawChunker  — Court judgments and orders: splits on paragraph numbers, extracts
                  a human-readable case title from the first page.

Both chunkers return (chunks, doc_title):
  chunks   : list of {section: str | None, content: str}
  doc_title: human-readable label used in citations and stored in doc_title column.
"""

import logging
import re
from abc import ABC, abstractmethod
from pathlib import Path

from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)


# ── Base ──────────────────────────────────────────────────────────────────────

class BaseChunker(ABC):
    def _read_pages(self, pdf_path: Path) -> tuple[list[str], str]:
        """Return (page_texts, first_page_text)."""
        reader = PdfReader(str(pdf_path))
        pages = [page.extract_text() or "" for page in reader.pages]
        return pages, (pages[0] if pages else "")

    @abstractmethod
    def chunk(self, pdf_path: Path) -> tuple[list[dict], str]:
        """
        Return (chunks, doc_title).
        Each chunk: {section: str | None, content: str}
          section  — citation label (e.g. "Section 8(5)", "¶12", "Para 3", None for fallback)
          content  — chunk body text
        doc_title  — human-readable document label for citations.
        """


# ── StatuteChunker ────────────────────────────────────────────────────────────

# Matches section/chapter headings in Indian gazette-format statutes.
# Captures: "Section 1", "SECTION 1", "1. Short title...", "CHAPTER I"
_STATUTE_HEADING = re.compile(
    r"(?:^|\n)"
    r"(?:"
    r"(?:SECTION|Section)\s+(\d+)"           # "Section 4" / "SECTION 4"
    r"|(\d{1,2})\.\s+[A-Z][A-Za-z\s,]{5,}"  # "4. Obligations of..."
    r"|(?:CHAPTER|Chapter)\s+[IVX\d]+"        # "CHAPTER II"
    r")",
    re.MULTILINE,
)


class StatuteChunker(BaseChunker):
    """
    Splits a statute PDF on Section/Chapter boundaries.

    Logic is extracted verbatim from the original ingest_dpdp.py — the chunk
    boundaries, section labels, and preamble handling are unchanged so that a
    re-ingestion of the same PDF produces byte-identical chunks.
    """

    DOC_TITLE = "The Digital Personal Data Protection Act, 2023"

    def chunk(self, pdf_path: Path) -> tuple[list[dict], str]:
        pages, _ = self._read_pages(pdf_path)
        text = "\n".join(pages)

        text = re.sub(r"\r\n?", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        matches = list(_STATUTE_HEADING.finditer(text))
        if not matches:
            return [{"section": "General", "content": text.strip()}], self.DOC_TITLE

        chunks: list[dict] = []

        preamble = text[: matches[0].start()].strip()
        if len(preamble) > 100:
            chunks.append({"section": "Preamble", "content": preamble})

        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            chunk_text = text[start:end].strip()

            if len(chunk_text) < 80:
                continue

            heading_line = chunk_text.split("\n")[0].strip()
            section_label = re.sub(r"[.\-–—]+$", "", heading_line).strip()
            if len(section_label) > 80:
                section_label = section_label[:80]

            chunks.append({"section": section_label, "content": chunk_text})

        return chunks, self.DOC_TITLE


# ── CaseLawChunker ────────────────────────────────────────────────────────────

# Paragraph numbering patterns common in Indian court judgments.
# Intentionally does NOT overlap with the statute heading patterns above.
_PARA_HEADING = re.compile(
    r"(?:^|\n)"
    r"(?:"
    r"¶\s*(\d+)"               # "¶12" or "¶ 12"
    r"|Para(?:graph)?\s+(\d+)" # "Para 12" or "Paragraph 12"
    r"|(\d{1,3})\.\s+\S"       # "12. <non-whitespace>" — number then period then text
    r")",
    re.MULTILINE,
)

# Looks for "X v. Y" or "X vs Y" patterns for extracting party names.
_PARTIES_RE = re.compile(
    r"(.{3,80}?)\s+(?:v(?:s\.?|ersus)?\.?|v/s)\s+(.{3,80})",
    re.IGNORECASE,
)

_WORDS_PER_CHUNK = 500
_WORD_OVERLAP = 50


def _fixed_size_chunks(text: str) -> list[dict]:
    """Fallback: fixed word-count chunks with overlap, section=None."""
    words = text.split()
    chunks: list[dict] = []
    idx = 0
    i = 0
    while i < len(words):
        window = words[i : i + _WORDS_PER_CHUNK]
        chunks.append({"section": None, "content": " ".join(window), "_fallback_index": idx})
        i += _WORDS_PER_CHUNK - _WORD_OVERLAP
        idx += 1
    return chunks


def _extract_case_title(first_page: str, filename: str) -> tuple[str, bool]:
    """
    Try to extract a human-readable case title from the first page.
    Returns (title, confident). If not confident, caller logs a warning.
    """
    lines = [ln.strip() for ln in first_page.split("\n") if ln.strip()]

    # Look for "X v. Y" in the first 30 lines.
    for line in lines[:30]:
        m = _PARTIES_RE.search(line)
        if m:
            p1 = m.group(1).strip().rstrip(".,;")
            p2 = m.group(2).strip().rstrip(".,;")
            if len(p1) >= 3 and len(p2) >= 3:
                return f"{p1} v. {p2}", True

    # Fall back to the first substantive line that isn't a citation number.
    for line in lines[:10]:
        if len(line) > 15:
            return line[:120], False

    return Path(filename).stem.replace("_", " "), False


class CaseLawChunker(BaseChunker):
    """
    Splits a court judgment PDF on paragraph-number boundaries.

    Falls back to fixed-size word-count chunks when no paragraph numbering
    is found (older judgments) — sets section=None for fallback chunks.

    Extracted doc_title comes from a "X v. Y" pattern on the first page;
    falls back to the filename stem with a logged warning if extraction is
    low-confidence so Jayesh can review and correct it.
    """

    def chunk(self, pdf_path: Path) -> tuple[list[dict], str]:
        pages, first_page = self._read_pages(pdf_path)
        text = "\n".join(pages)
        text = re.sub(r"\r\n?", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        doc_title, confident = _extract_case_title(first_page, pdf_path.name)
        if not confident:
            logger.warning(
                "[case_law] Low-confidence title extraction for %s — using %r. "
                "Review and consider renaming the file if this is wrong.",
                pdf_path.name,
                doc_title,
            )

        matches = list(_PARA_HEADING.finditer(text))

        if not matches:
            logger.warning(
                "[case_law] No paragraph numbering found in %s — using fixed-size chunks.",
                pdf_path.name,
            )
            return _fixed_size_chunks(text), doc_title

        chunks: list[dict] = []

        # Header block before the first numbered paragraph.
        header = text[: matches[0].start()].strip()
        if len(header) > 80:
            chunks.append({"section": "Header", "content": header})

        # Track seen labels to disambiguate repeated paragraph numbering
        # (common in multi-opinion judgments where each judge restarts from ¶1).
        seen_labels: dict[str, int] = {}

        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            chunk_text = text[start:end].strip()

            if len(chunk_text) < 40:
                continue

            g1, g2, g3 = match.group(1), match.group(2), match.group(3)
            if g1:
                section_label = f"¶{g1}"
            elif g2:
                section_label = f"Para {g2}"
            else:
                section_label = f"Para {g3}"

            count = seen_labels.get(section_label, 0) + 1
            seen_labels[section_label] = count
            if count > 1:
                section_label = f"{section_label} [{count}]"

            chunks.append({"section": section_label, "content": chunk_text})

        if not chunks:
            logger.warning(
                "[case_law] Paragraph chunking produced 0 valid chunks for %s — falling back.",
                pdf_path.name,
            )
            return _fixed_size_chunks(text), doc_title

        return chunks, doc_title
