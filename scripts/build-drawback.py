"""
Build src/lib/hs/drawback.json — All Industry Rates of Duty Drawback.

    python scripts/build-drawback.py

Drawback refunds customs duty paid on imported inputs used in an exported
product. Together with RoDTEP it is the pair of incentives an exporter actually
claims, so the two belong side by side.

THE THING THAT MAKES THIS DIFFERENT FROM RoDTEP
RoDTEP is keyed on real 8-digit ITC-HS tariff items, so it joins cleanly. The
Drawback Schedule is NOT. It carries its own "drawback tariff item" numbering
which follows the Customs Tariff only at the 4-digit heading and then subdivides
on its own terms. Measured against our ITC-HS dataset:

    drawback 8-digit codes  ->   0% are valid ITC-HS codes  (0 of 340)
    drawback 6-digit codes  ->   6% are valid HS subheadings (51 of 925)
    drawback 4-digit codes  -> 100% are valid HS headings    (419 of 419)

So 42020101 is a drawback item, not a tariff line; the ITC-HS line for the same
goods is 42022110. Attaching a drawback rate to an 8-digit ITC-HS code would
therefore be a fabricated join producing a confidently wrong number — the exact
failure this codebase exists to prevent.

WHAT WE DO INSTEAD
Index by 4-digit heading, which is the only level where the two classifications
agree, and keep every sub-item under it. A heading with one rate and no
sub-items gives a precise answer. A heading with sub-items yields a shortlist
the exporter (or a broker) chooses from, with the mismatch disclosed. Same
retrieve-then-choose principle as HS classification itself.

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
DEST = ROOT / "src" / "lib" / "hs" / "drawback.json"
CACHE = ROOT / ".rodtep-cache" / "drawback-77-2023.pdf"

# Notification 77/2023-Customs (N.T.) dated 20.10.2023, in force from
# 30.10.2023. CBIC's own portal is script-driven; this is the copy published by
# the Apparel Export Promotion Council, verified against the Gazette header on
# page 1. Replace with the CBIC URL if a direct one becomes available.
SRC_URL = "https://www.aepcindia.com/system/files/Duty%20Drawback%20Rates%202023.pdf"

FIRST_SCHEDULE_PAGE = 8  # pages before this are the notes and conditions

RATE = re.compile(r"^(\d+(?:\.\d+)?)%$")
NUM = re.compile(r"^\d+(?:\.\d+)?$")


def clean(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


def download() -> Path:
    if CACHE.exists():
        return CACHE
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    print(f"  downloading {CACHE.name} ...")
    req = urllib.request.Request(SRC_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=240) as r:
        CACHE.write_bytes(r.read())
    return CACHE


def parse(pdf_path: Path) -> dict[str, dict]:
    """
    Rows arrive with many empty cells from the PDF's column layout, so we work
    on the non-empty ones positionally: code, description, then unit / rate /
    cap identified by shape rather than index.
    """
    items: dict[str, dict] = {}

    with pdfplumber.open(pdf_path) as pdf:
        for i in range(FIRST_SCHEDULE_PAGE, len(pdf.pages)):
            for table in pdf.pages[i].extract_tables() or []:
                for raw in table:
                    cells = [clean(c) for c in raw]
                    vals = [c for c in cells if c]
                    if not vals:
                        continue

                    code = vals[0]
                    if not re.fullmatch(r"\d{4}|\d{6}|\d{8}", code):
                        continue

                    rate = cap = unit = None
                    desc_parts: list[str] = []
                    for v in vals[1:]:
                        m = RATE.match(v)
                        if m and rate is None:
                            rate = float(m.group(1))
                        elif rate is not None and cap is None and NUM.match(v):
                            cap = float(v)
                        elif rate is None and len(v) <= 12 and re.fullmatch(
                            r"[A-Za-z][A-Za-z/\.\s]{0,10}", v
                        ) and v.lower() not in {"others", "other"}:
                            unit = v  # Kg, u, Sq.m, Gm ...
                        elif rate is None:
                            desc_parts.append(v)

                    if rate is None:
                        # A heading row with no rate of its own — it exists only
                        # to group sub-items, which carry the rates.
                        continue

                    description = " ".join(desc_parts).strip()
                    prev = items.get(code)
                    # Later pages repeat headers; keep the richest description.
                    if prev and len(prev["t"]) >= len(description):
                        continue

                    items[code] = {
                        "c": code,
                        "t": description,
                        "u": unit or "",
                        "r": rate,
                        "cap": cap,
                    }
    return items


def main() -> None:
    print("Source: Notification 77/2023-Customs (N.T.), 20 October 2023")
    pdf_path = download()

    print("Parsing schedule ...")
    items = parse(pdf_path)
    if len(items) < 1000:
        sys.exit(
            f"Only {len(items)} drawback items parsed — expected ~1,900. "
            "Fix the parser rather than shipping a partial schedule."
        )

    # Group by the 4-digit heading, the only level that agrees with HS.
    headings: dict[str, list[dict]] = {}
    for it in items.values():
        headings.setdefault(it["c"][:4], []).append(it)
    for lines in headings.values():
        lines.sort(key=lambda x: x["c"])

    payload = {
        "schedule": "All Industry Rates of Duty Drawback",
        "notification": "Notification 77/2023-Customs (N.T.) dated 20.10.2023, "
                        "in force from 30.10.2023",
        "sourceUrl": SRC_URL,
        "keyedBy": "4-digit HS heading",
        "mismatchWarning": (
            "The Drawback Schedule uses its own tariff-item numbering below the "
            "4-digit heading and does NOT align with 8-digit ITC-HS codes. A rate "
            "here cannot be attributed to a specific ITC-HS line without a broker "
            "confirming which drawback item the goods fall under."
        ),
        "note": (
            "Rates are a percentage of FOB, capped at 'cap' rupees per unit. "
            "Chapter 71 rates have been revised several times since this "
            "notification; confirm gold and silver items separately."
        ),
        "headingCount": len(headings),
        "itemCount": len(items),
        "headings": {h: headings[h] for h in sorted(headings)},
    }

    DEST.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    single = sum(1 for v in headings.values() if len(v) == 1)
    rates = [i["r"] for i in items.values()]
    print(f"\nWrote {len(items):,} drawback items in {len(headings):,} headings to {DEST}")
    print(f"  headings with a single rate (unambiguous): {single:,}")
    print(f"  rate range: {min(rates)}% – {max(rates)}%")


if __name__ == "__main__":
    main()
