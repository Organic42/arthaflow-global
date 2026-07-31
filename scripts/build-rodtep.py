"""
Build src/lib/hs/rodtep.json — RoDTEP rates per 8-digit tariff line.

    python scripts/build-rodtep.py

RoDTEP (Remission of Duties and Taxes on Exported Products) refunds embedded
taxes to exporters as a percentage of FOB value, capped per unit. It is real
money back on every shipment, which makes it the rate an exporter cares about
most — and the one most dangerous to get wrong.

WHY THIS IS NOT ONE FILE
DGFT publishes a base schedule and then amends it by notification. Getting the
current rate means replaying that chain:

  1. Appendix 4R w.e.f. 10.10.2024  (Notification 32 dated 30.09.2024) — base
  2. Notification 15/2026-27 dated 30.04.2026, w.e.f. 01.05.2026:
       Annexure-A  tariff items ADDED to 4R
       Annexure-C  tariff items OMITTED from 4R and 4RE
       Annexure-D  descriptions CHANGED in 4R

We build Schedule 4R only. 4RE (Annexures B and E) covers SEZ, EOU and Advance
Authorisation exports, which are not our users.

THE 50% RATIONALISATION
In February 2026 DGFT limited benefits under 4R and 4RE to 50% of the notified
rates and value caps. We deliberately do NOT halve the stored rates. The
notified rate is the durable fact; the limitation is a policy overlay that has
already been extended once and may lapse or change again. Storing the notified
rate and describing the overlay separately means one of them going stale is
visible rather than silent.

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
DEST = ROOT / "src" / "lib" / "hs" / "rodtep.json"
CACHE = ROOT / ".rodtep-cache"

BASE_URL = "https://content.dgft.gov.in/Website/Appendix+4R+wef+10th+October+2024.pdf"
CHANGES_URL = "https://content.dgft.gov.in/Changes+to+be+made+in+Appendix+4R+and+Appendix+4RE.pdf"

# Applies to every line; see module docstring.
RATIONALISATION = {
    "factor": 0.5,
    "description": (
        "DGFT has limited benefits under Appendix 4R and 4RE to 50% of the "
        "notified rates and value caps. Rates below are the NOTIFIED rates."
    ),
    "notifiedOn": "2026-02-23",
    "verify": (
        "This limitation has been extended once already. Confirm whether it is "
        "still in force before quoting an effective rate."
    ),
}


def clean(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


def parse_rate(v: str) -> float | None:
    """'3.00%' -> 3.0. Returns None when the cell is blank or unparseable."""
    m = re.search(r"([\d.]+)\s*%", v)
    return float(m.group(1)) if m else None


def parse_cap(v: str) -> float | None:
    v = v.replace(",", "").strip()
    return float(v) if re.fullmatch(r"\d+(\.\d+)?", v) else None


def download(url: str, dest: Path) -> Path:
    if dest.exists():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  downloading {dest.name} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=240) as r:
        dest.write_bytes(r.read())
    return dest


def rows_with_code(pdf_path: Path, pages=None):
    """Yield (page_index, cells) for every table row carrying an 8-digit code."""
    with pdfplumber.open(pdf_path) as pdf:
        targets = range(len(pdf.pages)) if pages is None else pages
        for i in targets:
            for table in pdf.pages[i].extract_tables() or []:
                for raw in table:
                    cells = [clean(c) for c in raw]
                    if any(re.fullmatch(r"\d{8}", c) for c in cells):
                        yield i, cells


def parse_base(path: Path) -> dict[str, dict]:
    """Appendix 4R: Entry | Tariff Item | Description | UQC | Rate% | Cap."""
    out: dict[str, dict] = {}
    for _, cells in rows_with_code(path):
        idx = next(j for j, c in enumerate(cells) if re.fullmatch(r"\d{8}", c))
        code = cells[idx]
        desc = cells[idx + 1] if idx + 1 < len(cells) else ""
        uqc = cells[idx + 2] if idx + 2 < len(cells) else ""
        rate = parse_rate(cells[idx + 3] if idx + 3 < len(cells) else "")
        cap = parse_cap(cells[idx + 4] if idx + 4 < len(cells) else "")

        if rate is None:
            continue  # a row without a rate tells an exporter nothing
        out[code] = {"c": code, "t": desc, "u": uqc, "r": rate, "cap": cap}
    return out


def parse_annexure_a(path: Path) -> dict[str, dict]:
    """Additions to 4R — pages 1-5, same column shape as the base."""
    out: dict[str, dict] = {}
    for _, cells in rows_with_code(path, pages=range(0, 5)):
        idx = next(j for j, c in enumerate(cells) if re.fullmatch(r"\d{8}", c))
        code = cells[idx]
        rate = parse_rate(cells[idx + 3] if idx + 3 < len(cells) else "")
        if rate is None:
            continue
        out[code] = {
            "c": code,
            "t": cells[idx + 1] if idx + 1 < len(cells) else "",
            "u": cells[idx + 2] if idx + 2 < len(cells) else "",
            "r": rate,
            "cap": parse_cap(cells[idx + 4] if idx + 4 < len(cells) else ""),
        }
    return out


def parse_annexure_c(path: Path) -> set[str]:
    """Omitted tariff items — pages 11-12, marked literally 'Omitted'."""
    gone: set[str] = set()
    for _, cells in rows_with_code(path, pages=range(10, 12)):
        idx = next(j for j, c in enumerate(cells) if re.fullmatch(r"\d{8}", c))
        if any("omit" in c.lower() for c in cells[idx:]):
            gone.add(cells[idx])
    return gone


def parse_annexure_d(path: Path) -> dict[str, str]:
    """Description changes in 4R — page 13. Rate is unchanged."""
    changed: dict[str, str] = {}
    for _, cells in rows_with_code(path, pages=range(12, 13)):
        idx = next(j for j, c in enumerate(cells) if re.fullmatch(r"\d{8}", c))
        # Columns: Sr | Item | old description | NEW description | UQC | Rate | Cap
        new_desc = cells[idx + 2] if idx + 2 < len(cells) else ""
        if new_desc:
            changed[cells[idx]] = new_desc
    return changed


def main() -> None:
    print("Sources:")
    base_pdf = download(BASE_URL, CACHE / "appendix-4r-base.pdf")
    changes_pdf = download(CHANGES_URL, CACHE / "notification-15-changes.pdf")

    print("Parsing base Appendix 4R (this takes a minute) ...")
    lines = parse_base(base_pdf)
    print(f"  base: {len(lines):,} tariff lines")

    added = parse_annexure_a(changes_pdf)
    omitted = parse_annexure_c(changes_pdf)
    redescribed = parse_annexure_d(changes_pdf)
    print(f"  amendment: +{len(added)} added, -{len(omitted)} omitted, "
          f"{len(redescribed)} redescribed")

    for code in omitted:
        lines.pop(code, None)
    lines.update(added)
    for code, desc in redescribed.items():
        if code in lines:
            lines[code]["t"] = desc

    if len(lines) < 8000:
        sys.exit(
            f"Only {len(lines)} lines after amendments — the schedule has ~10,000. "
            "Fix the parser rather than shipping a partial rate table."
        )

    payload = {
        "schedule": "Appendix 4R — RoDTEP, DTA exports",
        "baseNotification": "Notification 32 dated 30.09.2024, w.e.f. 10.10.2024",
        "amendedBy": "Notification 15/2026-27 dated 30.04.2026, w.e.f. 01.05.2026",
        "sourceUrls": [BASE_URL, CHANGES_URL],
        "rationalisation": RATIONALISATION,
        "note": (
            "Rates are a percentage of FOB value, capped at 'cap' rupees per UQC. "
            "Schedule 4R applies to DTA exports; SEZ, EOU and Advance Authorisation "
            "exports fall under 4RE and are not included here."
        ),
        "count": len(lines),
        "entries": [lines[k] for k in sorted(lines)],
    }

    DEST.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    rates = [e["r"] for e in payload["entries"]]
    capped = sum(1 for e in payload["entries"] if e["cap"] is not None)
    print(f"\nWrote {len(lines):,} RoDTEP lines to {DEST}")
    print(f"  rate range: {min(rates)}% – {max(rates)}%")
    print(f"  lines with a value cap: {capped:,}")


if __name__ == "__main__":
    main()
