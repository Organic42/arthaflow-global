/**
 * HS code classification — grounded in the real nomenclature, not model recall.
 *
 * WHY THIS EXISTS: Saathi used to pick HS codes from the LLM's memory. For the
 * same question ("where can I export leather bags?") it variously chose 4202,
 * 420222, 4201 and 4102 — and 4102 is raw sheep hides. Every trade figure is
 * derived from that code, so a wrong guess produces a confidently wrong answer
 * the manufacturer has no way to detect.
 *
 * The fix is retrieve-then-choose: we search the actual nomenclature, hand the
 * model a shortlist, and it may only pick from that list. It can no longer
 * invent a code.
 *
 * DATA: UN Comtrade's H6 (HS 2022) reference — 6,939 entries, bundled at
 * src/lib/hs/hs-codes.json. Regenerate with scripts/build-hs-codes.mjs.
 * Crucially this is the same classification Comtrade queries against, so any
 * code we resolve is guaranteed to be valid there.
 *
 * SCOPE: 6-digit international codes. India's ITC-HS is 8 digits; the final two
 * (the Indian tariff line) are NOT derivable from this dataset and must be
 * confirmed against DGFT. Never fabricate them.
 */

import raw from "./hs-codes.json";
import {
  aliasesFor,
  phraseAliasesFor,
  ALIAS_WEIGHT,
  PHRASE_WEIGHT,
} from "./aliases";

interface RawEntry {
  c: string; // code
  t: string; // description
  p: string; // parent code ("" for chapters)
  l: number; // code length: 2 | 4 | 6
}

const ENTRIES = raw as RawEntry[];
const BY_CODE = new Map<string, RawEntry>(ENTRIES.map((e) => [e.c, e]));

export interface HsCandidate {
  code: string;
  description: string;
  /** 2 = chapter, 4 = heading, 6 = subheading. */
  level: number;
  /** Human-readable trail, e.g. "42 › 4202 › 420221". */
  path: string;
  /** Relative match strength within this result set (0-1, best = 1). */
  score: number;
}

// ── Text handling ────────────────────────────────────────────────────────────

/**
 * Words that appear in a large share of HS descriptions and carry no
 * discriminating signal ("other", "including", "parts thereof"...). Dropping
 * them stops a query like "other leather bags" from matching everything.
 */
const STOPWORDS = new Set([
  "the", "and", "or", "of", "for", "with", "without", "in", "on", "to", "a",
  "an", "not", "nes", "other", "others", "including", "included", "whether",
  "thereof", "parts", "than", "such", "as", "by", "from", "any", "all", "up",
  "their", "these", "those", "which", "used", "use", "kind", "kinds", "type",
  "types", "put", "form", "forms", "prepared", "preserved", "elsewhere",
  "specified", "similar", "articles", "article", "goods", "products", "product",
  "i", "my", "we", "our", "want", "sell", "export", "exports", "exporting",
  "make", "makes", "making", "manufacture", "manufacturing", "produce",
]);

/**
 * Ranges kept alongside a-z0-9 so vernacular product names survive
 * tokenisation: Devanagari (Hindi/Marathi), Bengali, Gujarati, Tamil, Telugu,
 * Kannada, Malayalam. Previously everything non-ASCII was replaced with
 * whitespace, so a Hindi query produced zero tokens and matched nothing.
 *
 * These characters never appear in the English nomenclature, so they only ever
 * enter a query — where the alias table translates them.
 */
const KEEP =
  /[^a-z0-9ऀ-ॿঀ-৿઀-૿஀-௿ఀ-౿ಀ-೿ഀ-ൿ\s]/g;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(KEEP, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Crude singular/plural folding so "bags" matches "bag" and "boxes" matches
 * "box". Deliberately simple — a full stemmer is not worth the dependency for
 * the accuracy it would add here.
 */
function fold(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && (w.endsWith("ses") || w.endsWith("xes") || w.endsWith("ches") || w.endsWith("shes")))
    return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// ── Inverted index (built once, lazily) ──────────────────────────────────────

let INDEX: Map<string, number[]> | null = null;
let DOC_TOKENS: string[][] | null = null;
let OWN_TERMS: Set<string>[] | null = null;

/**
 * How much an inherited term counts relative to one in the entry's own text.
 * Real but weaker signal: "doors" appearing in heading 8302 tells you its
 * subheadings cover door fittings, just less precisely than if 830241 said so.
 */
const INHERITED_WEIGHT = 0.6;

function buildIndex() {
  if (INDEX) return;
  const idx = new Map<string, number[]>();
  const docs: string[][] = new Array(ENTRIES.length);
  const own: Set<string>[] = new Array(ENTRIES.length);

  // Pass 1 — tokenize each entry's own description.
  const ownTokens: string[][] = ENTRIES.map((e) => tokenize(e.t).map(fold));

  // Pass 2 — inherit ancestors' terms. HS headings define the scope their
  // subheadings subdivide, so a 6-digit code genuinely "means" its parent's
  // words too. Without this, "brass door handles" misses 8302's children
  // entirely: only the 4-digit heading mentions doors.
  const indexByCode = new Map<string, number>();
  ENTRIES.forEach((e, i) => indexByCode.set(e.c, i));

  ENTRIES.forEach((e, i) => {
    const ownSet = new Set(ownTokens[i]);
    const combined = new Set(ownSet);

    let parentCode = e.p;
    let hops = 0;
    while (parentCode && hops++ < 3) {
      const pi = indexByCode.get(parentCode);
      if (pi === undefined) break;
      for (const t of ownTokens[pi]) combined.add(t);
      parentCode = ENTRIES[pi].p;
    }

    own[i] = ownSet;
    docs[i] = ownTokens[i]; // length signal stays based on the entry itself

    for (const t of combined) {
      const arr = idx.get(t);
      if (arr) arr.push(i);
      else idx.set(t, [i]);
    }
  });

  INDEX = idx;
  DOC_TOKENS = docs;
  OWN_TERMS = own;
}

// ── Query expansion ──────────────────────────────────────────────────────────

interface QueryTerm {
  term: string;
  weight: number;
}

/**
 * Turn a raw user query into weighted search terms, bringing in vernacular and
 * vocabulary bridges from the alias table.
 *
 * "brass door handles" contributes brass/door/handle at full weight plus
 * copper, zinc, base, metal, mounting, fitting at ALIAS_WEIGHT — which is what
 * lets it reach 8302, whose text shares no word with the query.
 * "चमड़े के बैग" contributes only aliases, since none of its characters occur
 * in the English nomenclature.
 */
function expandQuery(query: string): QueryTerm[] {
  const out = new Map<string, number>();
  const add = (t: string, w: number) => {
    const k = fold(t);
    if (k.length < 2) return;
    out.set(k, Math.max(out.get(k) ?? 0, w)); // strongest weight wins
  };

  const tokens = tokenize(query);

  // Phrases first — they are stronger evidence than either word alone, and
  // decide material-vs-function cases like "door handle".
  for (let i = 0; i < tokens.length - 1; i++) {
    const pair =
      phraseAliasesFor(tokens[i], tokens[i + 1]) ??
      phraseAliasesFor(fold(tokens[i]), fold(tokens[i + 1]));
    if (pair) for (const e of pair) add(e, PHRASE_WEIGHT);
  }

  for (const raw of tokens) {
    add(raw, 1);
    // Try the token as typed and its folded form, so both "handles" and
    // "handle" resolve against the table.
    const expansions = aliasesFor(raw) ?? aliasesFor(fold(raw));
    if (expansions) for (const e of expansions) add(e, ALIAS_WEIGHT);
  }

  return [...out].map(([term, weight]) => ({ term, weight }));
}

// ── Search ───────────────────────────────────────────────────────────────────

export interface SearchOptions {
  limit?: number;
  /** Restrict to a code length (6 = the level trade queries want). */
  level?: 2 | 4 | 6;
}

/**
 * Find the HS entries that best match a free-text product description.
 *
 * Scoring is IDF-weighted term overlap (rare words count for more), with a
 * bonus for how much of the query is covered and for exact phrase hits. Results
 * are intentionally a SHORTLIST for an LLM to choose from, not a single answer:
 * "leather bag" legitimately spans several codes and picking between them needs
 * the manufacturer's context.
 */
export function searchHsCodes(
  query: string,
  opts: SearchOptions = {}
): HsCandidate[] {
  buildIndex();
  const limit = opts.limit ?? 12;

  const qTerms = expandQuery(query);
  if (qTerms.length === 0) return [];

  // Only terms the nomenclature actually contains can contribute. Coverage is
  // measured against these, not the raw query — otherwise a Hindi word (which
  // never appears in the English text) would permanently depress every score.
  const effective = qTerms.filter((q) => INDEX!.has(q.term));
  if (effective.length === 0) return [];
  const totalWeight = effective.reduce((s, q) => s + q.weight, 0);

  const N = ENTRIES.length;
  const scores = new Map<number, number>();
  const matched = new Map<number, number>();

  for (const { term, weight } of effective) {
    const postings = INDEX!.get(term)!;
    // Rare terms discriminate; common ones barely move the needle.
    const idf = Math.log(1 + N / postings.length);
    for (const i of postings) {
      // Own-text hits outrank hits inherited from an ancestor heading.
      const docW = OWN_TERMS![i].has(term) ? 1 : INHERITED_WEIGHT;
      scores.set(i, (scores.get(i) ?? 0) + idf * docW * weight);
      matched.set(i, (matched.get(i) ?? 0) + docW * weight);
    }
  }

  if (scores.size === 0) return [];

  const ranked: Array<{ i: number; s: number }> = [];

  for (const [i, base] of scores) {
    const e = ENTRIES[i];
    if (opts.level && e.l !== opts.level) continue;

    // Chapter 99 is "commodities not specified according to kind" — HS's
    // catch-all bucket. It is a real code (so it stays valid for lookups), but
    // it is never the right answer for a manufacturer's product, and querying
    // trade data with it returns huge unclassified totals that look like real
    // product figures.
    if (e.c.startsWith("99")) continue;

    let s = base;

    // Reward covering more of what the user actually said.
    s *= 0.5 + 0.5 * ((matched.get(i) ?? 0) / totalWeight);

    // Shorter descriptions matching the same terms are more specific.
    const len = DOC_TOKENS![i].length || 1;
    s *= 1 + 1 / Math.sqrt(len);

    // Prefer 6-digit subheadings — that is what trade queries need.
    if (e.l === 6) s *= 1.25;
    else if (e.l === 2) s *= 0.75;

    // Direct phrase appearance is a strong signal.
    const descLower = e.t.toLowerCase();
    for (const { term } of effective) if (descLower.includes(term)) s *= 1.05;

    ranked.push({ i, s });
  }

  ranked.sort((a, b) => b.s - a.s);
  const top = ranked.slice(0, limit);
  const max = top[0]?.s || 1;

  return top.map(({ i, s }) => {
    const e = ENTRIES[i];
    return {
      code: e.c,
      description: e.t,
      level: e.l,
      path: hierarchyPath(e.c),
      score: Math.round((s / max) * 100) / 100,
    };
  });
}

// ── Lookup / validation ──────────────────────────────────────────────────────

export interface HsLookup {
  code: string;
  description: string;
  level: number;
  path: string;
}

/** Walk up the parent chain to render "42 › 4202 › 420221". */
function hierarchyPath(code: string): string {
  const parts: string[] = [];
  let cur: RawEntry | undefined = BY_CODE.get(code);
  let guard = 0;
  while (cur && guard++ < 6) {
    parts.unshift(cur.c);
    cur = cur.p ? BY_CODE.get(cur.p) : undefined;
  }
  return parts.join(" › ");
}

/**
 * Confirm a code exists in the nomenclature and describe it.
 *
 * Accepts 2/4/6 digits. An 8-digit ITC-HS code is truncated to its 6-digit
 * international root, which is the part Comtrade understands — we never claim
 * to validate the Indian tariff line.
 */
export function lookupHsCode(code: string): HsLookup | null {
  const digits = String(code ?? "").replace(/\D/g, "");
  if (digits.length < 2) return null;

  const candidates =
    digits.length >= 8
      ? [digits.slice(0, 6), digits.slice(0, 4), digits.slice(0, 2)]
      : [digits, digits.slice(0, 4), digits.slice(0, 2)];

  for (const c of candidates) {
    const e = BY_CODE.get(c);
    if (e) {
      return {
        code: e.c,
        description: e.t,
        level: e.l,
        path: hierarchyPath(e.c),
      };
    }
  }
  return null;
}

/**
 * Strict existence check for guarding trade queries.
 *
 * Deliberately does NOT use lookupHsCode: that walks up to the parent heading
 * or chapter, so "999999" would pass merely because chapter 99 exists. Comtrade
 * silently ignores a cmdCode it doesn't recognise and returns TOTAL trade
 * instead — which surfaces as a plausible, product-specific-looking answer that
 * is actually the country's entire trade. Only an exact match is acceptable.
 *
 * 8-digit ITC-HS input is reduced to its 6-digit international root first,
 * since that root is the part Comtrade classifies against.
 */
export function isValidHsCode(code: string): boolean {
  const digits = String(code ?? "").replace(/\D/g, "");
  if (digits.length < 2) return false;
  const normalized = digits.length >= 8 ? digits.slice(0, 6) : digits;
  return BY_CODE.has(normalized);
}

/** Entry count — used by tests and diagnostics. */
export function hsDatasetSize(): number {
  return ENTRIES.length;
}
