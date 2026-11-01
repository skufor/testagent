"""PDF export via reportlab."""

from __future__ import annotations

import os
from pathlib import Path

from config import ExportSettings
from src.documents.errors import ExportError
from src.documents.models import ReportDocument, sections_for_export

_STANDARD_FONTS = frozenset({"Helvetica", "Times-Roman", "Courier", "Symbol", "ZapfDingbats"})
_UNICODE_FONT = "DejaVuSans"
_UNICODE_PATH = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")


class PdfExporter:
    def __init__(self, settings: ExportSettings) -> None:
        self._settings = settings

    def export(self, document: ReportDocument, destination: Path) -> Path:
        """Write ``document`` to ``destination`` (suffix ``.pdf``). Return ``destination``."""
        sections = sections_for_export(document, destination, ".pdf")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            from reportlab.pdfgen import canvas

            _register_unicode(pdfmetrics, TTFont)
            font = _select_font(self._settings.pdf_font, document.title, sections, pdfmetrics)
            pdf = canvas.Canvas(str(temporary), pagesize=A4)
            pdf.setTitle(document.title)
            pdf.setAuthor(document.author)
            _, height = A4
            y = height - 72
            pdf.setFont(font, 16)
            y = _draw_wrapped(pdf, document.title, font, 16, y)
            for section in sections:
                if y < 96:
                    pdf.showPage()
                    y = height - 72
                size = 14 if section.level == 1 else 12
                pdf.setFont(font, size)
                y = _draw_wrapped(pdf, section.heading, font, size, y)
                pdf.setFont(font, 11)
                y = _draw_wrapped(pdf, section.body, font, 11, y)
            pdf.save()
            os.replace(temporary, destination)
        except ExportError:
            temporary.unlink(missing_ok=True)
            raise
        except Exception as exc:
            temporary.unlink(missing_ok=True)
            raise ExportError(destination, "pdf write failed") from exc
        finally:
            if temporary.exists():
                temporary.unlink(missing_ok=True)
        return destination


def _register_unicode(pdfmetrics: object, ttfont: type) -> None:
    names = set(pdfmetrics.getRegisteredFontNames())  # type: ignore[attr-defined]
    if _UNICODE_FONT in names or not _UNICODE_PATH.is_file():
        return
    pdfmetrics.registerFont(ttfont(_UNICODE_FONT, str(_UNICODE_PATH)))  # type: ignore[attr-defined]


def _select_font(requested: str, title: str, sections: tuple, pdfmetrics: object) -> str:
    names = set(pdfmetrics.getRegisteredFontNames())  # type: ignore[attr-defined]
    chosen = requested if requested in names or requested in _STANDARD_FONTS else "Helvetica"
    blob = title + "\n" + "\n".join(section.heading + "\n" + section.body for section in sections)
    if chosen in _STANDARD_FONTS and _needs_unicode(blob) and _UNICODE_FONT in names:
        return _UNICODE_FONT
    return chosen


def _needs_unicode(text: str) -> bool:
    try:
        text.encode("latin-1")
    except UnicodeEncodeError:
        return True
    return False


def _draw_wrapped(pdf: object, text: str, font: str, size: int, y: float) -> float:
    from reportlab.lib.pagesizes import A4

    width, _height = A4
    max_width = width - 144
    for paragraph in text.split("\n"):
        line = ""
        for word in paragraph.split(" "):
            trial = word if line == "" else f"{line} {word}"
            if pdf.stringWidth(trial, font, size) <= max_width:  # type: ignore[attr-defined]
                line = trial
                continue
            if line:
                pdf.drawString(72, y, line)  # type: ignore[attr-defined]
                y -= size + 4
            line = word
        pdf.drawString(72, y, line)  # type: ignore[attr-defined]
        y -= size + 8
        if y < 72:
            pdf.showPage()  # type: ignore[attr-defined]
            y = _height - 72
            pdf.setFont(font, size)  # type: ignore[attr-defined]
    return y
