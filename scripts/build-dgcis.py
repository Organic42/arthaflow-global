"""
Build src/lib/hs/dgcis.json — India's own export data, by 8-digit HS code and
destination country, sourced from the Department of Commerce's Trade
Intelligence and Analytics (TIA) Portal (DGCIS).

    python scripts/build-dgcis.py

WHY THIS EXISTS
India has zero holdings in UN Comtrade (see src/lib/wits/client.ts), so
getIndiaExports falls back to World Bank WITS — which only reports HS
*chapter groups* (16 buckets), not real HS codes, and lags a further year
behind. DGCIS is India's own customs-derived trade statistics: real 8-digit
ITC-HS lines, by destination country, which is exactly the granularity our
own classification already resolves to.

WHY THIS IS NOT AN API INTEGRATION
The TIA portal's data-extraction endpoint is CAPTCHA-gated — its own
public_data_extraction.js opens an image-captcha challenge and only fetches
data after /validateCaptcha returns a token. That is a deliberate anti-
scraping measure, and bypassing it is not something this codebase will do
(and would likely breach the portal's Terms of Use regardless). So there is
no automated pull here, unlike Comtrade/WITS.

THE WORKFLOW THIS SCRIPT SUPPORTS
1. A human visits https://trade-analytics.commerce.gov.in/public/de
2. Selects: Financial Year (the desired year), Export, HS8, Country =
   "Check all" (not just World — we need the per-destination breakdown)
3. Solves the CAPTCHA, clicks Submit, then "Export to CSV"
4. Drops the downloaded file(s) into .dgcis-source/ (gitignored — raw
   government exports are not committed, only what this script derives)
5. Re-runs this script

This is a manual, periodic refresh — the same pattern already used for
RoDTEP (build-rodtep.py) and Duty Drawback (build-drawback.py), both of
which vendor a government PDF by hand rather than hitting a live API. DGCIS
data should be disclosed the same way: dated, sourced, never framed as live.

EXPECTED CSV SHAPE (as exported by the portal's Data Extraction tab):
    Sr. No., HS Code, HS Description, Country Name,
    2019-20_INR, 2019-20_USD, 2020-21_INR, 2020-21_USD, ...

Only the most recent *_USD column with real data is used per run (pass
--year to pin one explicitly, e.g. --year 2024-25). INR columns are ignored;
the rest of the codebase is USD-denominated throughout.
"""

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / ".dgcis-source"
DEST = ROOT / "src" / "lib" / "hs" / "dgcis.json"

PORTAL_URL = "https://trade-analytics.commerce.gov.in/public/de"

# DGCIS spells some country names differently from src/lib/comtrade/countries.ts
# (which is itself a curated ~50-country list, not exhaustive). Only entries
# actually seen in DGCIS exports need mapping here — extend as new mismatches
# turn up rather than guessing ahead of time.
NAME_ALIASES = {
    "U S A": "UNITED STATES",
    "U K": "UNITED KINGDOM",
    "U ARAB EMTS": "UNITED ARAB EMIRATES",
    "SAUDI ARAB": "SAUDI ARABIA",
    "HONG KONG": "HONG KONG",
    "SINGAPORE": "SINGAPORE",
    "BAHARAIN IS": "BAHRAIN",
    "AMERI SAMOA": "AMERICAN SAMOA",
    "CHINA P RP": "CHINA",
    "KOREA RP": "SOUTH KOREA",
    "KOREA DP RP": "NORTH KOREA",
    "TAIWAN": "TAIWAN",
    "VIETNAM SOC REP": "VIETNAM",
    "NETHERLAND": "NETHERLANDS",
    "BANGLADESH PR": "BANGLADESH",
    "MYANMAR": "MYANMAR",
    "U K": "UNITED KINGDOM",
}


def clean(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


def normalize_country(raw_name: str) -> str:
    name = clean(raw_name).upper()
    return NAME_ALIASES.get(name, name)


def load_country_list():
    """Read {iso3, name} pairs straight out of countries.ts rather than
    hand-duplicating the list — it's the definitive source of what
    ArthaFlow already recognises, and staying in sync avoids silent drift."""
    ts = (ROOT / "src" / "lib" / "comtrade" / "countries.ts").read_text(encoding="utf-8")
    rows = re.findall(
        r'\{\s*m49:\s*-?\d+,\s*iso3:\s*"([A-Z]{3})",\s*name:\s*"([^"]+)"',
        ts,
    )
    by_name = {name.upper(): iso3 for iso3, name in rows}
    return by_name


def find_year_columns(header: list[str]) -> list[str]:
    return [h for h in header if re.fullmatch(r"\d{4}-\d{2}_USD", clean(h))]


def parse_number(v: str) -> float:
    v = clean(v).replace(",", "")
    if not v or v.lower() in ("na", "n/a", "-"):
        return 0.0
    try:
        return float(v)
    except ValueError:
        return 0.0


def pick_year(year_cols: list[str], rows: list[dict], requested: str | None) -> str:
    if requested:
        col = f"{requested}_USD"
        if col not in year_cols:
            sys.exit(f"--year {requested} not found in this CSV. Available: "
                      f"{[c.replace('_USD', '') for c in year_cols]}")
        return col

    # Default: the most recent year that actually has non-zero data in most
    # rows (the newest column is often present but empty — data availability
    # lags the current year, same issue Comtrade/WITS both have).
    year_cols_sorted = sorted(year_cols, reverse=True)
    for col in year_cols_sorted:
        nonzero = sum(1 for r in rows if parse_number(r.get(col, "0")) > 0)
        if nonzero >= max(5, len(rows) * 0.1):
            return col
    return year_cols_sorted[0] if year_cols_sorted else sys.exit("No *_USD year columns found in CSV.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", help='Financial year to extract, e.g. "2024-25". '
                                    "Defaults to the newest column with real data.")
    args = ap.parse_args()

    if not SOURCE_DIR.exists():
        sys.exit(
            f"No {SOURCE_DIR.relative_to(ROOT)}/ directory found.\n"
            f"Export CSVs from {PORTAL_URL} (Export type, HS8, all countries) "
            f"and drop them there first — see this script's module docstring."
        )

    csv_files = sorted(SOURCE_DIR.glob("*.csv"))
    if not csv_files:
        sys.exit(f"No .csv files in {SOURCE_DIR.relative_to(ROOT)}/.")

    countries_by_name = load_country_list()

    # hs8 -> { iso3 -> usd }  (summed across input files, in case the portal's
    # page size forced a multi-file export)
    by_hs: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    hs_descriptions: dict[str, str] = {}
    unmatched_countries: set[str] = set()
    year_used: str | None = None
    total_rows = 0
    skipped_bad_hs = 0

    for path in csv_files:
        with path.open(newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            header = reader.fieldnames or []
            year_cols = find_year_columns(header)
            if not year_cols:
                print(f"  ! {path.name}: no year columns matched, skipping")
                continue
            rows = list(reader)
            col = pick_year(year_cols, rows, args.year)
            if year_used and year_used != col:
                sys.exit(
                    f"Mismatched years across input files: {year_used} vs {col} "
                    f"(from {path.name}). Extract one financial year per run."
                )
            year_used = col

            for row in rows:
                total_rows += 1
                hs = re.sub(r"\D", "", clean(row.get("HS Code", "")))
                if len(hs) != 8:
                    skipped_bad_hs += 1
                    continue

                country_raw = clean(row.get("Country Name", ""))
                if not country_raw or country_raw.upper() == "WORLD":
                    continue  # aggregate row — we derive totals from summed destinations instead

                usd = parse_number(row.get(col, "0"))
                if usd <= 0:
                    continue

                norm = normalize_country(country_raw)
                iso3 = countries_by_name.get(norm)
                if not iso3:
                    unmatched_countries.add(country_raw)
                    continue

                by_hs[hs][iso3] += usd
                if hs not in hs_descriptions:
                    hs_descriptions[hs] = clean(row.get("HS Description", ""))

    if not by_hs:
        sys.exit("Parsed 0 usable rows. Check the CSV shape matches the module docstring.")

    entries = {}
    for hs, dests in by_hs.items():
        ranked = sorted(dests.items(), key=lambda kv: kv[1], reverse=True)
        total = sum(v for _, v in ranked)
        entries[hs] = {
            "description": hs_descriptions.get(hs, ""),
            "totalUsd": round(total, 2),
            "destinations": [
                {"iso3": iso3, "valueUsd": round(v, 2)} for iso3, v in ranked
            ],
        }

    out = {
        "source": "Trade Intelligence and Analytics (TIA) Portal, DGCIS — Department of Commerce, GoI",
        "sourceUrl": PORTAL_URL,
        "financialYear": (year_used or "").replace("_USD", ""),
        "note": (
            "Manually refreshed, not live — see build-dgcis.py docstring. "
            "Disclose the financial year and refresh date whenever this data "
            "is presented; never describe it as real-time."
        ),
        "hsCodeCount": len(entries),
        "entries": entries,
    }

    DEST.write_text(json.dumps(out, ensure_ascii=False, indent=None, separators=(",", ":")), encoding="utf-8")

    print(f"Wrote {DEST.relative_to(ROOT)}")
    print(f"  Financial year: {out['financialYear']}")
    print(f"  Rows read: {total_rows}  |  usable HS8 codes: {len(entries)}  |  skipped (bad HS code): {skipped_bad_hs}")
    if unmatched_countries:
        print(f"  ! {len(unmatched_countries)} country name(s) not in countries.ts — add to NAME_ALIASES or extend "
              f"countries.ts if these destinations matter:")
        for name in sorted(unmatched_countries):
            print(f"      {name}")


if __name__ == "__main__":
    main()
