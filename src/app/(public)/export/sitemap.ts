import type { MetadataRoute } from "next";
import { indexableLines, pathForLine } from "@/lib/seo/export-pages";

const BASE = "https://arthaflowglobal.com";

/**
 * Sitemap for the per-tariff-line pages, served at /export/sitemap.xml.
 *
 * Kept separate from the root sitemap because that one is a hand-maintained
 * list of eight marketing pages and this one is generated from the dataset —
 * mixing them would bury the pages a person edits inside ten thousand they
 * never touch.
 *
 * ONLY INDEXABLE LINES ARE LISTED. isIndexable() rejects lines whose sole
 * content is their own description; those pages still render for anyone
 * holding a link, but a sitemap is a request to crawl, and asking Google to
 * crawl thin pages is how a domain gets treated as a doorway farm.
 *
 * NO CHUNKING, DELIBERATELY. Google's limit is 50,000 URLs and 50MB per
 * sitemap; this emits roughly 10,600 URLs at well under a megabyte, so
 * generateSitemaps would be complexity without a reason. If the ITC-HS
 * dataset ever grows past ~45,000 indexable lines this must be split — note
 * that in Next 16 the `id` passed to a chunked sitemap is a Promise resolving
 * to a string, not a number, which is a change from 15.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // One timestamp for the whole set: these pages change when a notification is
  // re-vendored, not individually, and claiming per-page freshness we cannot
  // substantiate is the kind of thing that gets a sitemap ignored.
  const lastModified = new Date();

  return [
    // The growth ranking. Hand-listed because it is one page, not a generated
    // set, and it is the strongest single page in this section.
    {
      url: `${BASE}/export/growing`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    ...indexableLines().map((line) => ({
    url: `${BASE}${pathForLine(line)}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.5,
    })),
  ];
}
