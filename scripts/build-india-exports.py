"""
Build src/lib/hs/india-exports.json — what India actually exported, per 8-digit
ITC-HS line, per financial year.

    python scripts/build-india-exports.py ".dgcis-source/DGCIS_DATA.csv"

WHAT THIS IS, AND WHAT IT IS NOT
This is the NATIONAL total for a tariff line: every state, every month of a
financial year, summed. It answers "how much of this does India sell, and is
that growing".

It does NOT answer "who buys it". That needs a per-destination export from the
TIA portal and lands in dgcis.json via build-dgcis.py, which is a separate
file and a separate question. The two must not be conflated: this one has no
destination dimension at all.

WHY THIS EXISTS AS ITS OWN SCRIPT
The TIA portal's Data Extraction tab lets you break exports down by Indian
STATE or by destination COUNTRY. A state-wise export carries Country Name =
"World" on every row, which is useless to dgcis.ts but is a clean national
series once the states are summed. Rather than throw that away, it becomes the
trade figure on the per-tariff-line pages.

TWO CSV SHAPES ARE ACCEPTED, because the portal emits either depending on the
time granularity chosen:

  ANNUAL (preferred)
    Sr. No., HS Code, HS Description, Country Name,
    2019-20_INR_Cr, 2019-20_USD_Mn, 2020-21_INR_Cr, ...

  MONTHLY (what a state-wise export gives)
    ... April-2023-24_USD_Mn, August-2023-24_USD_Mn, ...

Annual is preferred where both are present: it needs no summation, it reaches
further back, and it avoids the rounding that accumulates over twelve monthly
figures. A monthly year is only emitted when all twelve months are there.

The financial year currently in progress is always excluded. A part-year total
sitting in a column beside full years is a number nobody reads correctly, and
on an annual export there are no month columns to detect it from.

INR columns are ignored; the rest of the codebase is USD-denominated
throughout.
"""

import argparse
import collections
import csv
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "lib" / "hs" / "india-exports.json"

SOURCE = (
    "Trade Intelligence and Analytics (TIA) Portal, DGCIS — "
    "Department of Commerce, Government of India"
)
SOURCE_URL = "https://trade-analytics.commerce.gov.in/public/de"

MONTHS = {
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March",
}

MONTHLY_RE = re.compile(r"^([A-Za-z]+)-(\d{4}-\d{2})_USD_Mn$")
ANNUAL_RE = re.compile(r"^(\d{4}-\d{2})_USD_Mn$")


def current_indian_fy(today: "datetime.date") -> str:
    """The financial year in progress. India's runs April to March."""
    start = today.year if today.month >= 4 else today.year - 1
    return f"{start}-{str(start + 1)[2:]}"


def parse_money(raw: str) -> float | None:
    """
    Parse a published figure, or None if it is not a number.

    THE COMMAS MATTER. DGCIS prints thousands separators, so a large line
    arrives as "2,949.732". An earlier version of this script called float()
    directly inside a bare `except ValueError: pass`, which turned every one of
    those into a silent zero — the national total came out 13% light and looked
    entirely plausible. Returning None instead lets the caller count what it
    could not read and refuse to write a file built on holes.
    """
    v = (raw or "").strip().replace(",", "")
    if not v or v.upper() in ("NA", "N/A", "-"):
        return 0.0
    try:
        return float(v)
    except ValueError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path", help="State-wise export CSV from the TIA portal")
    args = ap.parse_args()

    path = Path(args.csv_path)
    if not path.exists():
        print(f"  ! not found: {path}", file=sys.stderr)
        return 1

    with path.open(encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames is None:
            print("  ! empty CSV", file=sys.stderr)
            return 1

        by_year: dict[str, list[str]] = collections.defaultdict(list)
        annual = [c for c in reader.fieldnames if ANNUAL_RE.match(c)]

        if annual:
            shape = "annual"
            for col in annual:
                by_year[ANNUAL_RE.match(col).group(1)].append(col)
            complete = sorted(by_year)
        else:
            shape = "monthly"
            for col in reader.fieldnames:
                m = MONTHLY_RE.match(col)
                if m and m.group(1) in MONTHS:
                    by_year[m.group(2)].append(col)
            if not by_year:
                print(
                    "  ! no year columns found. Expected either <FY>_USD_Mn or "
                    "<Month>-<FY>_USD_Mn; see the docstring.",
                    file=sys.stderr,
                )
                return 1
            complete = sorted(y for y, cols in by_year.items() if len(cols) == 12)

        # The year in progress is always short, and on an annual export there
        # are no month columns to notice that from.
        in_progress = current_indian_fy(datetime.date.today())
        partial = sorted(y for y in by_year if y not in complete or y >= in_progress)
        complete = [y for y in complete if y < in_progress]

        if not complete:
            print("  ! no complete financial year in this file", file=sys.stderr)
            return 1

        totals: dict[str, list[float]] = {}
        descriptions: dict[str, str] = {}
        rows = 0
        skipped = 0
        unreadable = 0
        countries: set[str] = set()

        for row in reader:
            rows += 1
            countries.add((row.get("Country Name") or "").strip())
            code = (row.get("HS Code") or "").strip()
            if not code.isdigit() or len(code) != 8:
                skipped += 1
                continue

            slot = totals.setdefault(code, [0.0] * len(complete))
            for i, year in enumerate(complete):
                for col in by_year[year]:
                    parsed = parse_money(row.get(col, ""))
                    if parsed is None:
                        unreadable += 1
                        continue
                    slot[i] += parsed

            if code not in descriptions:
                desc = (row.get("HS Description") or "").strip()
                if desc:
                    descriptions[code] = desc

    # A per-destination file would list many countries and summing across them
    # here would be correct; summing across STATES is what this script assumes.
    # If both dimensions are present the totals silently multiply, so refuse.
    real_countries = {c for c in countries if c and c.upper() not in ("WORLD", "TOTAL")}
    if real_countries:
        print(
            f"  ! this CSV carries {len(real_countries)} destination countries as well as "
            "states. Summing both dimensions would multiply the totals. Re-export with "
            "only one breakdown, or use build-dgcis.py for the per-destination file.",
            file=sys.stderr,
        )
        return 1

    if unreadable:
        print(
            f"  ! {unreadable:,} values could not be parsed. Writing now would produce a "
            "total that is quietly short — fix the parser or the export first.",
            file=sys.stderr,
        )
        return 1

    entries = {
        code: [round(v, 3) for v in vals]
        for code, vals in sorted(totals.items())
        if any(v > 0 for v in vals)
    }

    payload = {
        "source": SOURCE,
        "sourceUrl": SOURCE_URL,
        "note": (
            "National totals: every Indian state and every month of the financial year, "
            "summed per 8-digit ITC-HS line. Carries NO destination breakdown — this "
            "says how much India sells of a line, never who buys it. Values are US$ "
            "million, as published."
        ),
        "unit": "USD million",
        "financialYears": complete,
        "partialYearsExcluded": partial,
        "hsCodeCount": len(entries),
        "entries": entries,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    print(f"  shape                  {shape}")
    print(f"  rows read              {rows:,}")
    print(f"  rows skipped (non-8dp) {skipped:,}")
    print(f"  codes with any value   {len(entries):,}")
    print(f"  financial years        {', '.join(complete)}")
    if partial:
        print(f"  excluded (part year)   {', '.join(partial)}")
    for i, year in enumerate(complete):
        tot = sum(v[i] for v in entries.values())
        print(f"    {year}  ${tot:,.0f} mn")
    print(f"  wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
