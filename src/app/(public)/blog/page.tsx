import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";

// This page carried a layout.tsx purely because it used to be a client
// component with a (non-functional) search box. It has no state now, so the
// metadata lives here and that file is gone.
export const metadata: Metadata = {
  title: "Export Briefing — What Changed for Indian Exporters",
  description:
    "The notifications and rulings behind India's export rates, linked to source: the US tariff cut to 18%, RoDTEP's extension and 50% restriction, India-UK CETA origin rules, and DGFT's e-commerce export handbook.",
  alternates: { canonical: "/blog" },
};

/**
 * The export briefing.
 *
 * WHAT THIS PAGE IS, AND IS NOT: every item here is somebody else's writing,
 * linked out and credited on the card. This is a reading list, not a set of
 * ArthaFlow posts — the previous version of this page showed six invented
 * headlines with invented dates and read-times, behind onClick handlers that
 * went nowhere. A manufacturer who clicked one learned that nothing on the
 * site could be trusted to be real.
 *
 * WHY A READING LIST AND NOT ARTICLES WE WROTE: the numbers this product
 * quotes come from notifications a manufacturer is entitled to check. Pointing
 * at the primary sources is the same discipline the data layer follows — the
 * page names the notification rather than asking you to take our word for it.
 *
 * MAINTENANCE: `whyItMatters` is ours; everything else is transcribed from the
 * linked page and was verified live when added. Rates and scheme deadlines
 * here go stale — RoDTEP in particular is running on six-month extensions —
 * so re-check the dates before trusting an item that is more than a quarter
 * old.
 */

interface Item {
  /** Publisher, shown on the card — the reader should know whose piece this is. */
  source: string;
  /** As published on the linked page. */
  date: string;
  category: "Tariffs" | "Incentives" | "Trade agreements" | "Getting started";
  title: string;
  /** Ours: why an Indian manufacturer should care. Not the publisher's words. */
  whyItMatters: string;
  href: string;
}

const FEATURED: Item = {
  source: "ClearTax",
  date: "July 2026",
  category: "Tariffs",
  title: "US Tariff on India: Impact, Affected Products, Rates and India's Response",
  whyItMatters:
    "The reciprocal tariff on most Indian goods entering the US fell from 50% to 18% in February 2026, and the extra 25% punitive duty was withdrawn. Textiles, leather, footwear and home décor are explicitly in scope at 18%; several agricultural lines go to zero. If you priced a US buyer during the 50% period, that quote is now wrong in your favour.",
  href: "https://cleartax.in/s/us-tariff-on-india",
};

const ITEMS: Item[] = [
  {
    source: "Morgan Lewis",
    date: "17 February 2026",
    category: "Tariffs",
    title: "US-India Trade Deal Cuts Tariffs, Eases Tensions",
    whyItMatters:
      "A law firm's read of what the deal actually commits each side to, rather than the headline number. Useful if you need to explain the change to a buyer.",
    href: "https://www.morganlewis.com/pubs/2026/02/us-india-trade-deal-cuts-tariffs-eases-tensions",
  },
  {
    source: "TaxGuru",
    date: "31 March 2026",
    category: "Incentives",
    title: "DGFT Extends Existing RoDTEP Rates for Exports till Sept 30, 2026",
    whyItMatters:
      "Notification 74/2025-26 keeps Appendix 4R and 4RE rates and value caps unchanged through 30 September 2026. RoDTEP has been running on six-month extensions, so check this date before you build the rebate into a quote.",
    href: "https://taxguru.in/dgft/dgft-extends-existing-rodtep-rates-exports-sept-30-2026.html",
  },
  {
    source: "EY India",
    date: "25 February 2026",
    category: "Incentives",
    title: "DGFT restricts RoDTEP benefits to 50% of notified rates and value caps",
    whyItMatters:
      "The single most misread thing about RoDTEP. The rate published against your tariff line is the notified rate; what you actually receive has been capped at half of it. Quote the effective figure, not the notified one.",
    href: "https://www.ey.com/en_in/technical/alerts-hub/2026/02/dgft-restricts-rodtep-benefits-to-50pc-of-notified-rates-and-value-caps-on-exported-products",
  },
  {
    source: "TaxGuru",
    date: "13 July 2026",
    category: "Trade agreements",
    title: "CBIC Issues Guidelines for Self-Certified Origin Declarations Under India–UK CETA",
    whyItMatters:
      "Circular 33/2026-Customs, issued as CETA came into force. Preferential origin for UK-bound goods is claimed electronically through the Trade Connect ePlatform — without a valid claim your buyer pays the full MFN rate.",
    href: "https://taxguru.in/custom-duty/cbic-issues-guidelines-self-certified-origin-declarations-india-uk-ceta.html",
  },
  {
    source: "DGFT, Ministry of Commerce & Industry",
    date: "Government handbook",
    category: "Getting started",
    title: "E-Commerce Exports Handbook for MSMEs",
    whyItMatters:
      "The primary government guide to exporting by courier and post. Relevant because Duty Drawback and RoDTEP now extend to courier-mode exports, and the courier value ceiling is ₹10 lakh — a first shipment no longer needs a container.",
    href: "https://content.dgft.gov.in/Website/EcommExportHandbokMSME_E.pdf",
  },
  {
    source: "India Briefing",
    date: "February 2026",
    category: "Tariffs",
    title: "What's in the India-US Trade Deal? Tariffs and Import Targets",
    whyItMatters:
      "Sector-by-sector breakdown of which Indian goods land at 18%, which go to zero, and what India conceded in return. The closest thing to a line-level view of the deal.",
    href: "https://www.india-briefing.com/news/india-us-trade-deal-tariff-cuts-timeline-42471.html/",
  },
];

const CATEGORY_STYLE: Record<Item["category"], string> = {
  Tariffs: "bg-red-bg text-error",
  Incentives: "bg-gold-bg text-[#92710A] dark:text-artha-gold",
  "Trade agreements": "bg-purple-bg text-purple",
  "Getting started": "bg-blue-bg text-action-blue",
};

/** The bare host, so the reader knows where a click lands before making it. */
function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function Category({ c }: { c: Item["category"] }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_STYLE[c]}`}
    >
      {c}
    </span>
  );
}

export default function BlogPage() {
  return (
    <section className="min-h-[70vh] bg-background px-6 pb-24 pt-14 sm:px-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-text-muted">
          Export briefing
        </div>
        <h1 className="mb-3 max-w-[760px] text-4xl font-extrabold leading-[1.1] tracking-tight text-text-heading">
          What changed for Indian exporters this year
        </h1>
        <p className="mb-12 max-w-[640px] text-[15px] leading-relaxed text-text-secondary">
          We didn&apos;t write any of these — we read them, because they are the notifications
          and rulings behind the rates this site quotes. Every card links to the original and
          names who published it, so you can check our numbers against the source.
        </p>

        {/* Featured — the change with the widest effect on Indian exporters. */}
        <a
          href={FEATURED.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group mb-6 block rounded-xl border border-text-muted/25 bg-card p-7 transition-colors hover:border-artha-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold sm:p-9"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Category c={FEATURED.category} />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
              {FEATURED.source} · {FEATURED.date}
            </span>
          </div>
          <h2 className="mb-3 max-w-[780px] text-2xl font-extrabold leading-tight tracking-tight text-text-heading">
            {FEATURED.title}
          </h2>
          <p className="mb-5 max-w-[720px] text-[15px] leading-relaxed text-text-secondary">
            {FEATURED.whyItMatters}
          </p>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-heading">
            Read on {hostOf(FEATURED.href)}
            <ArrowUpRight
              size={14}
              className="transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
            />
          </span>
        </a>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl border border-text-muted/25 bg-card p-6 transition-colors hover:border-artha-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
            >
              <div className="mb-3.5">
                <Category c={a.category} />
              </div>
              <h3 className="mb-2 text-[16.5px] font-bold leading-snug text-text-heading">
                {a.title}
              </h3>
              <p className="mb-5 flex-1 text-[13.5px] leading-relaxed text-text-secondary">
                {a.whyItMatters}
              </p>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted">
                {a.source} · {a.date}
              </div>
              <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-heading">
                {hostOf(a.href)}
                <ArrowUpRight
                  size={12}
                  className="transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
                />
              </span>
            </a>
          ))}
        </div>

        <p className="mt-12 max-w-[720px] border-t border-text-muted/25 pt-6 text-[12.5px] leading-relaxed text-text-muted">
          Links were checked when this page was last updated. Trade rates move by notification
          and RoDTEP is currently running on six-month extensions, so treat anything here as
          the state of play on its publication date rather than as advice for today. Nothing on
          this page is written by ArthaFlow, and none of it is legal or tax advice.
        </p>
      </div>
    </section>
  );
}
