import { lookupTariffLine, tariffLinesFor, type TariffLine } from "@/lib/hs/itchs";
import { lookupGst } from "@/lib/hs/gst";
import { lookupRodtep } from "@/lib/hs/rodtep";
import { drawbackForHsCode } from "@/lib/hs/drawback";
import itchs from "@/lib/hs/itchs-export.json";

/**
 * Shared logic for the per-tariff-line pages at /export/[slug].
 *
 * WHY THESE PAGES EXIST
 * The product holds 12,310 verified Indian tariff lines with export policy,
 * GST, RoDTEP and Duty Drawback attached, and none of it was reachable from a
 * search engine — every route into that data went through a client-side search
 * box, which a crawler cannot type into. This turns the dataset the company
 * already built into its distribution.
 *
 * WHY NO DESTINATION DUTY ON THESE PAGES
 * Everything rendered here comes from vendored files and resolves
 * synchronously. Destination duty comes from WITS TRAINS over the network, and
 * pre-rendering 12,310 lines against 80 markets would be 985,000 upstream
 * lookups for pages nobody has asked for yet. The pages answer the India side
 * in full and hand off to /tools for the destination side, which is exactly
 * the split the two data layers already have.
 *
 * WHY NOT EVERY LINE IS INDEXABLE
 * A line whose only content is its own description is a thin page, and twelve
 * thousand of those is how a domain earns a doorway-page penalty rather than
 * traffic. isIndexable() requires a line to carry something a reader could act
 * on. The rest still render — a direct link must always work — but ask not to
 * be indexed.
 */

/** The raw record shape in itchs-export.json, whose keys are abbreviated. */
interface RawLine {
  c: string;
  t: string;
  pol: string;
  cond: string;
  p: string;
}

const RAW = (itchs as { entries: RawLine[] }).entries;

/** URL-safe slug from a DGFT description. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** The canonical path for a line: code first, so the URL is self-identifying. */
export function pathForLine(line: Pick<TariffLine, "code" | "description">): string {
  const tail = slugify(line.description);
  return `/export/${line.code}${tail ? `-${tail}` : ""}`;
}

/**
 * Pull the 8-digit code out of a slug.
 *
 * The description tail is decorative — it exists for the reader and for the
 * keywords, not for resolution. A stale or hand-edited tail must still land on
 * the right line, so only the leading digits are trusted, and the page
 * canonicalises back to the correct slug.
 */
export function codeFromSlug(slug: string): string | null {
  const m = /^(\d{8})/.exec(slug ?? "");
  return m ? m[1] : null;
}

export interface LineFacts {
  line: TariffLine;
  gst: ReturnType<typeof lookupGst>;
  rodtep: ReturnType<typeof lookupRodtep>;
  drawback: ReturnType<typeof drawbackForHsCode>;
  /** Other lines under the same 6-digit heading, for internal linking. */
  siblings: TariffLine[];
}

export function factsFor(code: string): LineFacts | null {
  const line = lookupTariffLine(code);
  if (!line) return null;
  return {
    line,
    gst: lookupGst(line.code),
    rodtep: lookupRodtep(line.code),
    drawback: drawbackForHsCode(line.code),
    siblings: tariffLinesFor(line.hsParent).filter((l) => l.code !== line.code),
  };
}

/**
 * Whether a page carries enough of its own substance to deserve indexing.
 *
 * Deliberately strict. A restriction, a rebate, a drawback rate or a GST rate
 * that is not just the chapter fallback all give a reader a reason to be on
 * the page. A bare description does not.
 */
export function isIndexable(f: LineFacts): boolean {
  if (f.line.policy !== "Free") return true;
  if (f.line.condition.trim().length > 0) return true;
  if (f.rodtep !== null) return true;
  if (f.drawback !== null) return true;
  if (!f.gst.isCatchAll) return true;
  return false;
}

/**
 * Lines pre-rendered at build time. The rest are rendered on first request and
 * cached, because building twelve thousand pages on every deploy costs minutes
 * to serve pages that may never be asked for.
 *
 * Ordered by how much each page actually says, so the most substantial ones
 * are the ones that exist before a crawler ever arrives.
 */
export function seedLines(limit = 750): TariffLine[] {
  const scored: Array<{ line: TariffLine; score: number }> = [];
  for (const raw of RAW) {
    const f = factsFor(raw.c);
    if (!f || !isIndexable(f)) continue;
    let score = 0;
    if (f.rodtep) score += 3;
    if (f.drawback) score += 2;
    if (!f.gst.isCatchAll) score += 2;
    if (f.line.policy !== "Free") score += 1;
    if (f.line.condition) score += 1;
    scored.push({ line: f.line, score });
  }
  scored.sort((a, b) => b.score - a.score || a.line.code.localeCompare(b.line.code));
  return scored.slice(0, limit).map((s) => s.line);
}

/** Every line worth listing in the sitemap. */
export function indexableLines(): TariffLine[] {
  const out: TariffLine[] = [];
  for (const raw of RAW) {
    const f = factsFor(raw.c);
    if (f && isIndexable(f)) out.push(f.line);
  }
  return out;
}
