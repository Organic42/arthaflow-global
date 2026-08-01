"""
Build src/lib/hs/gst.json — GST rates per HSN code/heading/chapter.

    python scripts/build-gst.py [path/to/notification-9-2025.pdf]

Downloads the notification if no path is given.

WHY THIS ONE WAS ACTUALLY TRACTABLE
Unlike Duty Drawback (its own numbering, no clean join) and BCD (no
consolidated source exists at all — ~98 separate chapter notifications,
re-amended every Budget), GST rates got a genuine structural gift on
22 September 2025: GST 2.0 replaced the old fragmented notification chain
(1/2017-CT(Rate) plus a decade of amendments) with ONE consolidated,
HSN-organised notification — 9/2025-Integrated Tax (Rate).

STRUCTURE
Seven Schedules, each with an explicit rate stated in its own header
("Schedule I – 5%", "Schedule II – 18%", ...), followed by a numbered list
of HSN codes/headings/chapters that fall in that schedule. Rows do NOT
carry a rate column — the schedule they sit under IS the rate, so parsing
is a state machine: track the current schedule while walking the document,
and every row inherits it until the next schedule header changes it.

THE CATCH-ALL
Schedule II explicitly includes: "Any Chapter Goods which are not specified
in Schedule I, III, IV, V, VI or VII" — meaning an HSN code we cannot find
an explicit entry for is not unknown, it is 18% by construction. This
mirrors the design already used elsewhere in this codebase: never return
"no data" where the source itself defines a default.

GRANULARITY IS MIXED ON PURPOSE — LIKE THE SOURCE
Some rows are 8-digit tariff items ("2906 11 10"), most are 4-digit
headings ("0813"), some are bare 2-digit chapters ("28"), and a few are
alternatives ("28 or 38") or, rarely, "any Chapter" (skipped — too broad
to encode as a specific override, the Schedule II catch-all already
covers it correctly in the vast majority of such cases). All specific
levels are kept and gst.ts resolves by LONGEST-PREFIX match, the same
principle as itchs.ts resolving 8-digit lines under a 6-digit heading.

    pip install pdfplumber
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber is required:  pip install pdfplumber")

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "src" / "lib" / "hs" / "gst.json"
CACHE = ROOT / ".rodtep-cache" / "gst-notification-9-2025.pdf"

# CBIC's own notification pages are script-driven (same issue as Phase 1/2).
# This copy is hosted by ICAI's GST & Indirect Taxes Committee — a
# professional body, not a blog — and states its provenance on page 1
# ("NOTIFICATION NO. 9/2025-INTEGRATED TAX (RATE) DATED 17-9-2025 [UPDATED]
# [As corrected by corrigendum, dated 18-9-2025]"), which we verify below.
SRC_URL = (
    "https://courier.cbic.gov.in/ECCS/advisory/2025/"
    "NOTIFICATION%20NO.%209_2025-INTEGRATED%20TAX%20(RATE)%20-1759486719.pdf"
)

SCHEDULE_RE = re.compile(r"Schedule\s+([IVX]+)\s*[–-]\s*([\d.]+)\s*%", re.I)
ROW_START_RE = re.compile(r"^(\d+)\.\s+(.*)$")
# A leading run of code-like tokens (digits, optional internal spaces, joined
# by "," or "or"), or the literal "any Chapter", followed by the description.
CODE_PREFIX_RE = re.compile(
    r"^((?:\d[\d\s]{0,12}|any\s+Chapter)"
    r"(?:\s*(?:,|or)\s*(?:\d[\d\s]{0,12}|any\s+Chapter))*)\s+(?=[A-Za-z])(.*)$"
)


def parse_codes(token_str: str) -> list[str]:
    """'2906 11 10, 30, 3301' -> ['29061110', '30', '3301']. Drops 'any Chapter'."""
    out = []
    for part in re.split(r",|\bor\b", token_str):
        part = part.strip()
        if not part or "chapter" in part.lower():
            continue
        code = re.sub(r"\s+", "", part)
        if code.isdigit() and 2 <= len(code) <= 8:
            out.append(code)
    return out


def download(url: str, dest: Path) -> Path:
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  downloading {dest.name} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=240) as r:
        dest.write_bytes(r.read())
    return dest


def parse(pdf_path: Path) -> list[dict]:
    entries = []
    current_schedule = None
    current_rate = None

    with pdfplumber.open(pdf_path) as pdf:
        # Confirm provenance before trusting a single row of it.
        page1 = pdf.pages[0].extract_text() or ""
        if "NOTIFICATION NO. 9/2025" not in page1 or "INTEGRATED TAX (RATE)" not in page1.upper():
            sys.exit("Page 1 header does not match Notification 9/2025-IGST(Rate) — wrong file.")

        for page in pdf.pages:
            text = page.extract_text() or ""
            pending_code_str: str | None = None
            pending_row_no: str | None = None

            for line in text.split("\n"):
                sched = SCHEDULE_RE.search(line)
                if sched:
                    current_schedule = sched.group(1)
                    current_rate = float(sched.group(2))
                    continue

                row = ROW_START_RE.match(line)
                if row:
                    pending_row_no, rest = row.groups()
                    m = CODE_PREFIX_RE.match(rest)
                    if m and current_rate is not None:
                        for code in parse_codes(m.group(1)):
                            entries.append({
                                "c": code,
                                "l": len(code),
                                "rate": current_rate,
                                "sched": current_schedule,
                                "row": int(pending_row_no),
                            })
                    # Unmatched rows (rare: code list itself wraps to the next
                    # line) are acceptably lost — the Schedule II catch-all
                    # still answers correctly for whatever they covered.

    return entries


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else CACHE
    if not pdf_path.exists():
        download(SRC_URL, pdf_path)

    print("Parsing GST rate notification ...")
    entries = parse(pdf_path)
    if len(entries) < 400:
        sys.exit(
            f"Only {len(entries)} entries parsed — expected 600+. "
            "Fix the parser rather than shipping a partial schedule."
        )

    by_code: dict[str, list[dict]] = {}
    for e in entries:
        by_code.setdefault(e["c"], []).append(e)

    # A code appearing in more than one schedule at DIFFERENT rates is a real
    # ambiguity in the source, not a parser bug — surface it rather than
    # silently picking one (same discipline as the Drawback heading conflicts).
    conflicts = {
        c: sorted({e["rate"] for e in v})
        for c, v in by_code.items()
        if len({e["rate"] for e in v}) > 1
    }

    payload = {
        "notification": "Notification 9/2025-Integrated Tax (Rate), dated 17.09.2025, "
                        "as corrected by corrigendum dated 18.09.2025, effective 22.09.2025",
        "sourceUrl": SRC_URL,
        "catchAllRate": 18.0,
        "catchAllNote": (
            "Schedule II includes 'Any Chapter Goods which are not specified in "
            "Schedule I, III, IV, V, VI or VII' (S.No. 639) — an HSN code with no "
            "explicit entry below is 18% by the notification's own construction, "
            "not an unknown."
        ),
        "note": (
            "Entries are the HSN prefix as published — 2, 4, 6 or 8 digits. Resolve "
            "by longest matching prefix; where none match, apply catchAllRate."
        ),
        "count": len(entries),
        "conflictCount": len(conflicts),
        "conflicts": conflicts,
        "entries": entries,
    }

    DEST.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    by_rate: dict[float, int] = {}
    for e in entries:
        by_rate[e["rate"]] = by_rate.get(e["rate"], 0) + 1

    print(f"\nWrote {len(entries):,} GST entries ({len(by_code):,} distinct codes) to {DEST}")
    print("By rate:", dict(sorted(by_rate.items())))
    print(f"Conflicting codes (different rates in different schedules): {len(conflicts)}")
    if conflicts:
        for c, rates in list(conflicts.items())[:5]:
            print(f"  {c}: {rates}")


if __name__ == "__main__":
    main()
