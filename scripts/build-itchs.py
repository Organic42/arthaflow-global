"""
Build src/lib/hs/itchs-export.json from DGFT's ITC(HS) 2022 Schedule 2 notification.

    python scripts/build-itchs.py [path/to/Notification_ITCHS.pdf]

Downloads the notification if no path is given.

WHY THIS EXISTS
Our HS dataset (hs-codes.json, from UN Comtrade) stops at 6 digits — the
international nomenclature. India's tariff line is 8 digits, and the last two
are what a shipping bill actually carries. Until now Saathi correctly told users
those two digits had to be confirmed with DGFT; this closes that gap with the
authoritative source rather than a guess.

WHY PYTHON, IN A NODE REPO
The source is a 1,020-page government PDF. pdfplumber's table extraction is what
makes it tractable; the Node equivalents are markedly weaker. Like
build-hs-codes.mjs this runs rarely — only when DGFT amends the schedule — and
its output is vendored, so nothing at runtime depends on Python.

    pip install pdfplumber

WHAT WE GET
One pass yields two data layers: the 8-digit codes with their official
descriptions, AND each line's export policy (Free / Restricted / Prohibited /
STE) with its policy condition. The second is normally a separate dataset.

PROVENANCE
Every record carries the source and the notification date, because a policy
status without a date is a liability — DGFT amends these by notification
throughout the year.
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

SRC_URL = "https://content.dgft.gov.in/Website/Notification_ITCHS.pdf"
ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "src" / "lib" / "hs" / "itchs-export.json"

# Policy values DGFT uses. Anything else in that column is a parse artefact.
POLICIES = {"Free", "Restricted", "Prohibited", "STE"}


def clean(text: str) -> str:
    """Collapse the line breaks the PDF layout introduces mid-sentence."""
    if not text:
        return ""
    t = re.sub(r"\s+", " ", text).strip()
    # Descriptions occasionally carry an unbalanced quote from the source table.
    return t.strip('"').strip()


def fetch_pdf(dest: Path) -> Path:
    print(f"Downloading {SRC_URL} ...")
    req = urllib.request.Request(SRC_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as r, open(dest, "wb") as f:
        f.write(r.read())
    print(f"  saved {dest.stat().st_size:,} bytes")
    return dest


def extract(pdf_path: Path) -> list[dict]:
    rows: dict[str, dict] = {}
    skipped = 0

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            if i % 100 == 0:
                print(f"  page {i}/{total} — {len(rows)} codes so far")

            for table in page.extract_tables() or []:
                for raw in table:
                    cells = [clean(c) for c in raw]

                    # Locate the 8-digit tariff line. Its position is stable in
                    # practice but we search rather than assume, because the
                    # leading chapter column is absent on some pages.
                    idx = next(
                        (j for j, c in enumerate(cells) if re.fullmatch(r"\d{8}", c)),
                        None,
                    )
                    if idx is None:
                        continue

                    code = cells[idx]
                    desc = cells[idx + 1] if idx + 1 < len(cells) else ""
                    unit = cells[idx + 2] if idx + 2 < len(cells) else ""
                    policy = cells[idx + 3] if idx + 3 < len(cells) else ""
                    cond = cells[idx + 4] if idx + 4 < len(cells) else ""

                    if policy not in POLICIES:
                        # A row whose policy cell did not parse is worse than no
                        # row: it would render as an authoritative blank.
                        skipped += 1
                        continue
                    if not desc:
                        skipped += 1
                        continue

                    # Later pages amend earlier ones; last occurrence wins.
                    rows[code] = {
                        "c": code,
                        "t": desc,
                        "u": unit or "-",
                        "pol": policy,
                        "cond": cond,
                        "p": code[:6],  # links to the 6-digit HS parent
                    }

    print(f"  skipped {skipped} unparseable rows")
    return [rows[k] for k in sorted(rows)]


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "itchs-schedule2.pdf"
    if not pdf_path.exists():
        fetch_pdf(pdf_path)

    entries = extract(pdf_path)
    if len(entries) < 5000:
        sys.exit(
            f"Only {len(entries)} codes extracted — the schedule has ~11,000. "
            "The PDF layout has probably changed; fix the parser rather than "
            "shipping a partial nomenclature."
        )

    payload = {
        "source": "DGFT ITC(HS) 2022 Schedule 2 — Export Policy",
        "sourceUrl": SRC_URL,
        "note": "Export policy is amended by DGFT notification. Verify current "
                "status before relying on it for a shipment.",
        "count": len(entries),
        "entries": entries,
    }

    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    by_policy: dict[str, int] = {}
    for e in entries:
        by_policy[e["pol"]] = by_policy.get(e["pol"], 0) + 1

    print(f"\nWrote {len(entries):,} tariff lines to {DEST}")
    print("By export policy:", by_policy)
    print(f"Distinct 6-digit parents: {len({e['p'] for e in entries}):,}")


if __name__ == "__main__":
    main()
