"""
Sentinel -- Zero-Dependency PDF Generator
Converts all .txt documents in sample_documents/ to PDFs.
Uses ONLY Python standard library -- no pip required.

Usage:
    python generate_pdfs.py
"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import os
import sys
import textwrap
from pathlib import Path
from datetime import datetime

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent / "sample_documents"
COMPANY  = "VINDHYA STEELWORKS PVT. LTD."
ADDRESS  = "Chandrapur Industrial Zone, Maharashtra  442 401"


# ════════════════════════════════════════════════════════════════════════════════
# Minimal PDF writer — no dependencies
# Generates valid PDF 1.4 with proper cross-reference table and font embedding.
# Uses Helvetica and Courier (built-in PDF fonts, no embedding needed).
# ════════════════════════════════════════════════════════════════════════════════

class SimplePDF:
    """Minimal PDF generator using only Python stdlib."""

    PAGE_W  = 595   # A4 width  in points (72 pt/inch × 8.27 in)
    PAGE_H  = 842   # A4 height in points (72 pt/inch × 11.69 in)
    MARGIN  = 50    # left/right margin in points
    TOP     = 790   # y start (PDF coords: 0 = bottom)
    BOTTOM  = 55    # y stop (footer area)

    def __init__(self):
        self._objects   = []   # list of (offset, content_bytes)
        self._pages     = []   # object indices of page objects
        self._offsets   = []   # byte offset of each object in the file
        self._streams   = []   # (page_obj_idx, stream content as str)
        self._buf       = b""  # accumulated output bytes
        self._font_obj  = None

    # ── Low-level object helpers ──────────────────────────────────────────────

    def _add_obj(self, content: str) -> int:
        """Add a PDF object, return its 1-based object number."""
        self._objects.append(content.encode())
        return len(self._objects)

    # ── Font registration ─────────────────────────────────────────────────────

    def _setup_fonts(self):
        # We need 2 fonts: Helvetica (sans) and Courier (mono)
        self._font_helv = self._add_obj(
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica "
            "/Encoding /WinAnsiEncoding >>"
        )
        self._font_helv_b = self._add_obj(
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold "
            "/Encoding /WinAnsiEncoding >>"
        )
        self._font_cour = self._add_obj(
            "<< /Type /Font /Subtype /Type1 /BaseFont /Courier "
            "/Encoding /WinAnsiEncoding >>"
        )
        self._font_cour_b = self._add_obj(
            "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold "
            "/Encoding /WinAnsiEncoding >>"
        )

    # ── Text helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _pdf_str(s: str) -> str:
        """Escape a string for PDF text output."""
        s = s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        # Replace non-latin1 characters
        result = []
        for ch in s:
            try:
                ch.encode("latin-1")
                result.append(ch)
            except (UnicodeEncodeError, UnicodeDecodeError):
                result.append("?")
        return "".join(result)

    # ── Page building ─────────────────────────────────────────────────────────

    def _build_stream(self, lines: list[str], doc_type: str) -> str:
        """Build the PDF content stream for one page from a list of text lines."""
        ops = []

        def text_at(x, y, font_ref, size, text, color=(0, 0, 0)):
            r, g, b = [c / 255.0 for c in color]
            ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")   # fill color
            ops.append("BT")
            ops.append(f"/F{font_ref} {size} Tf")
            ops.append(f"{x} {y} Td")
            ops.append(f"({self._pdf_str(text)}) Tj")
            ops.append("ET")
            ops.append("0 0 0 rg")  # reset to black

        def rect_fill(x, y, w, h, color):
            r, g, b = [c / 255.0 for c in color]
            ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
            ops.append(f"{x} {y} {w} {h} re f")
            ops.append("0 0 0 rg")

        def hline(x1, y, x2, color=(200, 200, 200), width=0.5):
            r, g, b = [c / 255.0 for c in color]
            ops.append(f"{r:.3f} {g:.3f} {b:.3f} RG")
            ops.append(f"{width} w")
            ops.append(f"{x1} {y} m {x2} {y} l S")
            ops.append("0 0 0 RG")

        # ── Header bar ──
        rect_fill(0, self.PAGE_H - 38, self.PAGE_W, 38, (18, 18, 18))
        text_at(self.MARGIN, self.PAGE_H - 16, "HelvB", 9,
                COMPANY, color=(0, 204, 160))
        text_at(self.MARGIN, self.PAGE_H - 27, "Helv", 7,
                ADDRESS, color=(140, 140, 140))
        # Doc type label (right side, teal pill)
        rect_fill(420, self.PAGE_H - 34, 130, 28, (0, 180, 140))
        text_at(430, self.PAGE_H - 17, "HelvB", 8,
                doc_type[:20], color=(255, 255, 255))

        # ── Thin separator ──
        hline(self.MARGIN, self.PAGE_H - 42, self.PAGE_W - self.MARGIN,
              color=(0, 180, 140), width=1.0)

        # ── Footer ──
        hline(self.MARGIN, 48, self.PAGE_W - self.MARGIN,
              color=(80, 80, 80), width=0.5)
        today = datetime.now().strftime("%d %b %Y")
        footer = f"Sentinel Demo Corpus  |  Synthetic Document — All persons and events are fictional  |  {today}"
        text_at(self.MARGIN, 35, "Helv", 6, footer, color=(140, 140, 140))

        # ── Body text ──
        y = self.PAGE_H - 58   # start below header
        line_h_body    = 12    # normal line height
        line_h_section = 13    # section header

        for raw_line in lines:
            if y < self.BOTTOM + 10:
                break  # page overflow guard (simple: just stop)

            line = raw_line.rstrip()

            # Blank line
            if line == "":
                y -= 5
                continue

            # Divider (═══ or ───)
            if len(line) > 3 and set(line.strip()) <= {"═", "─", "=", "-"}:
                hline(self.MARGIN, y + 2, self.PAGE_W - self.MARGIN,
                      color=(245, 166, 35), width=0.6)
                y -= 7
                continue

            # Skip company name / address (already in header)
            if COMPANY.lower() in line.lower() or "chandrapur" in line.lower():
                continue

            # Section header: short all-uppercase lines
            stripped = line.strip()
            is_section = (
                len(stripped) > 2
                and stripped == stripped.upper()
                and any(c.isalpha() for c in stripped)
                and len(stripped) < 80
            )

            # WARNING / CRITICAL callout
            if stripped.startswith("WARNING:") or stripped.startswith("⚠") or stripped.startswith("CRITICAL:"):
                rect_fill(self.MARGIN - 2, y - 3, self.PAGE_W - 2 * self.MARGIN + 4, 12,
                          (255, 243, 220))
                text_at(self.MARGIN + 2, y, "CourB", 7.5,
                        stripped[:110], color=(160, 80, 0))
                y -= line_h_body
                continue

            # NOTE callout
            if stripped.startswith("NOTE:") or stripped.startswith("Post-incident note"):
                rect_fill(self.MARGIN - 2, y - 3, self.PAGE_W - 2 * self.MARGIN + 4, 12,
                          (230, 240, 255))
                text_at(self.MARGIN + 2, y, "Cour", 7.5,
                        stripped[:110], color=(60, 80, 160))
                y -= line_h_body
                continue

            if is_section:
                # Amber section header
                y -= 3
                text_at(self.MARGIN, y, "HelvB", 8,
                        stripped[:100], color=(200, 130, 0))
                y -= line_h_section
                continue

            # Regular body: wrap long lines
            max_chars = 110
            wrapped = textwrap.wrap(line, width=max_chars) if len(line) > max_chars else [line]

            for wl in wrapped:
                if y < self.BOTTOM + 10:
                    break
                # Table-like lines (contain |) — monospace, slightly smaller
                if "|" in wl or wl.startswith("  ") or wl.startswith("\t"):
                    text_at(self.MARGIN, y, "Cour", 7.5, wl, color=(30, 30, 30))
                else:
                    text_at(self.MARGIN, y, "Cour", 8, wl, color=(30, 30, 30))
                y -= line_h_body

        return "\n".join(ops)

    # ── Full document assembly ────────────────────────────────────────────────

    def generate(self, txt_path: Path, pdf_path: Path):
        """Convert a .txt file to a PDF file."""
        text  = txt_path.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()

        name = txt_path.stem
        doc_type = ("WORK ORDER" if "work_order" in name else
                    "INCIDENT REPORT" if "incident" in name else
                    "SHIFT LOG" if "shift_log" in name else
                    "INSPECTION" if "inspection" in name else
                    "OEM MANUAL" if "oem_manual" in name else
                    "REGULATORY" if "regulatory" in name else
                    "RCA REPORT" if "rca_" in name else "DOCUMENT")

        # ── Build PDF objects ──
        self._objects = []
        self._font_helv = self._font_helv_b = self._font_cour = self._font_cour_b = None
        self._setup_fonts()

        content_stream = self._build_stream(lines, doc_type)
        stream_bytes   = content_stream.encode("latin-1", errors="replace")
        stream_len     = len(stream_bytes)

        # Content stream object
        stream_obj = self._add_obj(
            f"<< /Length {stream_len} >>\nstream\n"
        )
        # (We'll append the stream bytes specially)
        self._stream_data = stream_bytes

        # Page object
        page_obj = self._add_obj(
            f"<< /Type /Page /Parent 8 0 R "
            f"/MediaBox [0 0 {self.PAGE_W} {self.PAGE_H}] "
            f"/Contents {stream_obj} 0 R "
            f"/Resources << /Font << "
            f"/FHelv {self._font_helv} 0 R "
            f"/FHelvB {self._font_helv_b} 0 R "
            f"/FCour {self._font_cour} 0 R "
            f"/FCourB {self._font_cour_b} 0 R "
            f">> >> >>"
        )

        # Pages dict — object 8
        pages_obj = self._add_obj(
            f"<< /Type /Pages /Kids [{page_obj} 0 R] /Count 1 >>"
        )

        # Catalog — object 9
        catalog_obj = self._add_obj(
            f"<< /Type /Catalog /Pages {pages_obj} 0 R >>"
        )

        # ── Write the file ──
        buf    = b"%PDF-1.4\n"
        xrefs  = {}

        for i, obj_content in enumerate(self._objects, start=1):
            xrefs[i] = len(buf)
            buf += f"{i} 0 obj\n".encode()
            buf += obj_content

            # Attach stream data right after the stream object header
            if i == stream_obj:
                buf += b"\n"
                buf += self._stream_data
                buf += b"\nendstream\n"
            else:
                buf += b"\n"

            buf += b"endobj\n\n"

        # Cross-reference table
        xref_offset = len(buf)
        n = len(self._objects) + 1
        buf += f"xref\n0 {n}\n0000000000 65535 f \n".encode()
        for i in range(1, n):
            buf += f"{xrefs[i]:010d} 00000 n \n".encode()

        buf += (
            f"trailer\n<< /Size {n} /Root {catalog_obj} 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode()

        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        pdf_path.write_bytes(buf)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Sentinel  PDF Generator  (zero-dependency)")
    print(f"Source folder: {BASE_DIR}")
    print("=" * 60 + "\n")

    txt_files = sorted(BASE_DIR.rglob("*.txt"))

    if not txt_files:
        print("ERROR: No .txt files found in", BASE_DIR)
        sys.exit(1)

    print(f"Converting {len(txt_files)} documents...\n")
    pdf = SimplePDF()
    ok = err = 0

    for txt_path in txt_files:
        pdf_path = txt_path.with_suffix(".pdf")
        try:
            pdf.generate(txt_path, pdf_path)
            size_kb = pdf_path.stat().st_size // 1024
            rel = str(txt_path.relative_to(BASE_DIR))
            print(f"  [OK]  {rel}  ->  {pdf_path.name}  ({size_kb} KB)")
            ok += 1
        except Exception as exc:
            print(f"  [ERR] {txt_path.name}  ERROR: {exc}")
            err += 1

    print(f"\n{'=' * 60}")
    print(f"Done.  {ok} PDFs created,  {err} errors.")
    print(f"\nPDFs are ready for ingestion into Sentinel.")
    print("The FastAPI backend reads them with pdfplumber.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
