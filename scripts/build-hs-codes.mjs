/**
 * Regenerate src/lib/hs/hs-codes.json from UN Comtrade's H6 (HS 2022) reference.
 *
 *   COMTRADE_API_KEY=... node scripts/build-hs-codes.mjs
 *
 * We vendor this rather than fetching at runtime because it changes only when
 * the WCO revises the nomenclature (every ~5 years), and because classification
 * must not depend on a network call. It is also the exact classification UN
 * Comtrade queries against, so any code we resolve is valid there.
 */

import fs from "node:fs";
import path from "node:path";

const SRC = "https://comtradeapi.un.org/files/v1/app/reference/H6.json";
const DEST = path.join(process.cwd(), "src", "lib", "hs", "hs-codes.json");

const key = process.env.COMTRADE_API_KEY;
if (!key) {
  console.error("COMTRADE_API_KEY is required.");
  process.exit(1);
}

const res = await fetch(SRC, {
  headers: { "Ocp-Apim-Subscription-Key": key },
});
if (!res.ok) {
  console.error(`Comtrade returned ${res.status}`);
  process.exit(1);
}

const { results } = await res.json();

const out = [];
for (const r of results ?? []) {
  const code = String(r.id ?? "").trim();
  if (!code || !/^\d+$/.test(code)) continue; // drop "TOTAL" and friends

  // `text` arrives as "420221 - Description"; the code prefix is redundant.
  const text = String(r.text ?? "")
    .trim()
    .replace(new RegExp(`^\\s*${code}\\s*-\\s*`), "");

  const parent = String(r.parent ?? "").trim();

  out.push({
    c: code,
    t: text,
    p: /^\d+$/.test(parent) ? parent : "",
    l: code.length,
  });
}

out.sort((a, b) => a.c.localeCompare(b.c));

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, JSON.stringify(out), "utf8");

const byLevel = out.reduce((m, e) => ((m[e.l] = (m[e.l] ?? 0) + 1), m), {});
console.log(`Wrote ${out.length} entries to ${DEST}`);
console.log("By level:", byLevel);
