"""
PDF report generation for DPDP compliance assessments.

Uses ReportLab (programmatic control, no system dependencies).
Returns PDF as bytes — the router wraps it in StreamingResponse.

VigorousONE brand colors (sampled from logo assets/vigorousone-logo.jpg):
  GOLD  = #F0C018  (dominant gold/yellow, 24.6% of mark pixels)
  NAVY  = #184860  (dominant dark blue,   24.6% of mark pixels)
  TEAL  = #307860  (accent green-teal,    16.4% of mark pixels)
  DARK  = #183060  (deepest navy,          7.4% of mark pixels)
"""

from __future__ import annotations

import io
import os
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from scoring import (
    RISK_CATEGORIES,
    CATEGORY_TO_SLUG,
    get_category_explanation,
    score_label,
)

# ── Brand colors ───────────────────────────────────────────────────────────────

GOLD     = colors.HexColor("#F0C018")
NAVY     = colors.HexColor("#184860")
TEAL     = colors.HexColor("#307860")
DARK     = colors.HexColor("#183060")
WHITE    = colors.white
GREY_BG  = colors.HexColor("#F5F5F5")
GREY_TXT = colors.HexColor("#555555")
RED      = colors.HexColor("#C0392B")

LOGO_PATH = Path(__file__).parent / "assets" / "vigorousone-logo.jpg"

W, H = A4
MARGIN = 18 * mm


# ── Style helpers ──────────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()

    cover_title = ParagraphStyle(
        "CoverTitle",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=34,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=0,
    )
    cover_sub = ParagraphStyle(
        "CoverSub",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=TEAL,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=0,
    )
    cover_inst = ParagraphStyle(
        "CoverInst",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=22,
        textColor=DARK,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=0,
    )
    cover_meta = ParagraphStyle(
        "CoverMeta",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=GREY_TXT,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=0,
    )
    section_hdr = ParagraphStyle(
        "SectionHdr",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=WHITE,
        alignment=TA_LEFT,
        leftIndent=6,
        spaceAfter=0,
    )
    cat_name = ParagraphStyle(
        "CatName",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=NAVY,
        spaceAfter=2,
    )
    body = ParagraphStyle(
        "Body",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=GREY_TXT,
        spaceAfter=4,
        leading=13,
    )
    small = ParagraphStyle(
        "Small",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=GREY_TXT,
    )
    rec_hdr = ParagraphStyle(
        "RecHdr",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=NAVY,
        spaceAfter=2,
    )

    return {
        "cover_title": cover_title,
        "cover_sub": cover_sub,
        "cover_inst": cover_inst,
        "cover_meta": cover_meta,
        "section_hdr": section_hdr,
        "cat_name": cat_name,
        "body": body,
        "small": small,
        "rec_hdr": rec_hdr,
    }


_BAND_HEX: dict[str, str] = {"Critical": "C0392B", "Moderate": "F0C018", "Good": "307860"}


def _band_color(band: str) -> colors.Color:
    if band == "Critical":
        return RED
    if band == "Moderate":
        return GOLD
    return TEAL


def _score_bar(score: float, width: float = 60 * mm, height: float = 5 * mm) -> Table:
    """SVG-style horizontal score bar rendered as a two-cell Table."""
    filled = max(0.0, min(1.0, score / 100.0))
    c = _band_color(score_label(score))
    tbl = Table(
        [["", ""]],
        colWidths=[width * filled, width * (1 - filled)],
        rowHeights=[height],
    )
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), c),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#E0E0E0")),
        ("LINEABOVE",  (0, 0), (-1, -1), 0, colors.white),
        ("LINEBELOW",  (0, 0), (-1, -1), 0, colors.white),
        ("LINEBEFORE", (0, 0), (-1, -1), 0, colors.white),
        ("LINEAFTER",  (0, 0), (-1, -1), 0, colors.white),
    ]))
    return tbl


# ── Page template with footer logo ────────────────────────────────────────────

def _footer(canvas, doc):
    canvas.saveState()
    # Thin NAVY rule above footer
    canvas.setStrokeColor(NAVY)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 12 * mm, W - MARGIN, 12 * mm)

    # Footer text
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GREY_TXT)
    canvas.drawString(MARGIN, 8 * mm, "EduPrivacy AI — DPDP Compliance Platform")
    canvas.drawRightString(W - MARGIN, 8 * mm, f"Page {doc.page}")

    # Small logo in footer (if file exists)
    if LOGO_PATH.exists():
        try:
            canvas.drawImage(
                str(LOGO_PATH), W - MARGIN - 12 * mm, 6 * mm,
                width=10 * mm, height=10 * mm, preserveAspectRatio=True, mask="auto",
            )
        except Exception:
            pass

    canvas.restoreState()


# ── Main PDF builder ──────────────────────────────────────────────────────────

def generate_pdf(attempt: dict, institution: dict) -> bytes:
    """
    Build and return a branded VigorousONE / EduPrivacy AI PDF compliance report.

    Parameters
    ----------
    attempt     : dict from queries._attempt_to_dict — contains overall_score,
                  category_scores, created_at, id
    institution : dict from queries._institution_row_to_dict — name, type, etc.
    """
    buf = io.BytesIO()
    s = _styles()

    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        topMargin=MARGIN,
        bottomMargin=20 * mm,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
    )

    content_width = W - 2 * MARGIN

    main_frame = Frame(
        MARGIN, 20 * mm,
        content_width, H - MARGIN - 20 * mm,
        id="main",
    )
    doc.addPageTemplates([
        PageTemplate(id="main", frames=[main_frame], onPage=_footer),
    ])

    story = []

    # ── Cover page ─────────────────────────────────────────────────────────────
    story.append(Spacer(1, 20 * mm))

    if LOGO_PATH.exists():
        try:
            logo = Image(str(LOGO_PATH), width=32 * mm, height=32 * mm)
            logo.hAlign = "CENTER"
            story.append(logo)
        except Exception:
            pass

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("EduPrivacy AI", s["cover_title"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("DPDP Compliance Assessment Report", s["cover_sub"]))
    story.append(Spacer(1, 14 * mm))
    story.append(HRFlowable(width=content_width, color=GOLD, thickness=2))
    story.append(Spacer(1, 12 * mm))

    story.append(Paragraph(institution.get("name", "—"), s["cover_inst"]))
    story.append(Spacer(1, 4 * mm))
    if institution.get("type"):
        story.append(Paragraph(institution["type"], s["cover_meta"]))
        story.append(Spacer(1, 3 * mm))
    if institution.get("location"):
        story.append(Paragraph(institution["location"], s["cover_meta"]))
        story.append(Spacer(1, 3 * mm))

    story.append(Spacer(1, 12 * mm))

    # Overall score box
    overall = attempt["overall_score"]
    band = score_label(overall)
    band_color = _band_color(band)

    score_tbl = Table(
        [[f"{overall:.0f}", f"{band}"]],
        colWidths=[content_width * 0.4, content_width * 0.6],
        rowHeights=[18 * mm],
    )
    score_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, 0), NAVY),
        ("BACKGROUND",   (1, 0), (1, 0), band_color),
        ("TEXTCOLOR",    (0, 0), (-1, -1), WHITE),
        ("FONTNAME",     (0, 0), (0, 0), "Helvetica-Bold"),
        ("FONTNAME",     (1, 0), (1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (0, 0), 28),
        ("FONTSIZE",     (1, 0), (1, 0), 20),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(score_tbl)
    story.append(Spacer(1, 6 * mm))

    date_str = attempt.get("created_at", "")[:10]
    story.append(Paragraph(f"Assessment date: {date_str}", s["cover_meta"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("Powered by VigorousONE · EduPrivacy AI", s["cover_meta"]))

    story.append(PageBreak())

    # ── Per-category breakdown ─────────────────────────────────────────────────

    story.append(Spacer(1, 4 * mm))

    # Section header
    hdr_tbl = Table(
        [["  Risk Category Breakdown"]],
        colWidths=[content_width],
        rowHeights=[10 * mm],
    )
    hdr_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 13),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(hdr_tbl)
    story.append(Spacer(1, 4 * mm))

    category_scores = attempt["category_scores"]

    for cat in RISK_CATEGORIES:
        score = category_scores.get(cat, 0.0)
        cat_band = score_label(score)
        cat_color = _band_color(cat_band)

        # Get low-scoring questions placeholder (we don't have per-question data here)
        # so we produce an explanation based purely on band + score
        explanation = get_category_explanation(cat, score, cat_band, [])

        # Category row: name left, score + band right
        cat_row = Table(
            [[
                Paragraph(cat, s["cat_name"]),
                Paragraph(
                    f"<b>{score:.0f}/100</b>  <font color='#{_BAND_HEX.get(cat_band, '555555')}'><b>{cat_band}</b></font>",
                    ParagraphStyle("ScoreRight", parent=s["body"], alignment=TA_RIGHT),
                ),
            ]],
            colWidths=[content_width * 0.65, content_width * 0.35],
        )
        cat_row.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, GREY_BG),
        ]))
        story.append(cat_row)
        story.append(_score_bar(score, width=content_width))
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(explanation, s["body"]))
        story.append(Spacer(1, 5 * mm))

    story.append(PageBreak())

    # ── Recommendations ────────────────────────────────────────────────────────

    hdr_tbl2 = Table(
        [["  Priority Recommendations"]],
        colWidths=[content_width],
        rowHeights=[10 * mm],
    )
    hdr_tbl2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TEAL),
        ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 13),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(hdr_tbl2)
    story.append(Spacer(1, 4 * mm))

    # Bottom 3 scoring categories
    sorted_cats = sorted(RISK_CATEGORIES, key=lambda c: category_scores.get(c, 0.0))
    low_cats = sorted_cats[:3]

    for i, cat in enumerate(low_cats, 1):
        score = category_scores.get(cat, 0.0)
        cat_band = score_label(score)
        expl = get_category_explanation(cat, score, cat_band, [])

        story.append(Paragraph(f"{i}. {cat} — {score:.0f}/100 ({cat_band})", s["rec_hdr"]))
        story.append(Paragraph(expl, s["body"]))
        story.append(Spacer(1, 4 * mm))

    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width=content_width, color=GOLD, thickness=1))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "This report was generated by EduPrivacy AI, powered by VigorousONE. "
        "It is intended as a self-assessment guide and does not constitute legal advice. "
        "For regulatory compliance, consult a qualified legal professional.",
        ParagraphStyle("Disclaimer", parent=s["small"], textColor=GREY_TXT, alignment=TA_CENTER),
    ))

    doc.build(story)
    return buf.getvalue()
