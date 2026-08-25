import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Check, AlertTriangle, Ban, ArrowRight } from "lucide-react";
import { describeGst } from "@/lib/hs/gst";
import { describeRodtep } from "@/lib/hs/rodtep";
import { describeDrawback } from "@/lib/hs/drawback";
import { lookupHsCode } from "@/lib/hs/classify";
import { JsonLdScript } from "@/components/arthaflow/json-ld";
import {
  codeFromSlug,
  factsFor,
  isIndexable,
  pathForLine,
  seedLines,
  type LineFacts,
} from "@/lib/seo/export-pages";

/**
 * One page per Indian tariff line — see lib/seo/export-pages.ts for why these
 * exist and which of them are allowed to be indexed.
 *
 * Server-rendered with no client JavaScript: every figure here comes out of a
 * vendored file synchronously, so a crawler that runs no JS still sees the
 * whole page. That is the entire point — the same data was already on /tools,
 * but only behind a search box a crawler cannot type into.
 */

// Rebuilt daily. The underlying files change by government notification, not
// by the hour, and a stale page is only ever a day behind the deploy.
export const revalidate = 86400;

// Lines outside the pre-rendered seed still resolve; they render on first
// request and are cached from then on.
export const dynamicParams = true;

export function generateStaticParams() {
  return seedLines().map((line) => ({
    slug: pathForLine(line).replace("/export/", ""),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const code = codeFromSlug(slug);
  const f = code ? factsFor(code) : null;
  if (!f) return { title: "Tariff line not found" };

  const rate = f.rodtep ? `RoDTEP ${f.rodtep.notifiedRatePct}%` : null;
  const gst = f.gst.unambiguous ? `GST ${f.gst.candidates[0]?.rate}%` : null;
  const bits = [gst, rate].filter(Boolean).join(", ");

  return {
    title: `Export ${f.line.description} from India — HS ${f.line.code}`,
    description:
      `${f.line.description} (ITC-HS ${f.line.code}) is ${f.line.policy.toLowerCase()} to export ` +
      `from India${bits ? `. ${bits}` : ""}. Export policy, GST, RoDTEP and Duty Drawback, ` +
      `from the government notifications that set them.`,
    alternates: { canonical: pathForLine(f.line) },
    // Thin lines still resolve for anyone holding the link, but ask not to be
    // indexed rather than padding the site with pages that say nothing.
    robots: isIndexable(f) ? undefined : { index: false, follow: true },
  };
}

const POLICY: Record<string, { tone: string; Icon: typeof Check; label: string }> = {
  Free: { tone: "text-[#0E7A5F] dark:text-[#34D399]", Icon: Check, label: "Free to export" },
  Restricted: { tone: "text-[#8A6310] dark:text-artha-gold", Icon: AlertTriangle, label: "Restricted" },
  STE: { tone: "text-[#8A6310] dark:text-artha-gold", Icon: AlertTriangle, label: "State trading only" },
  Prohibited: { tone: "text-error", Icon: Ban, label: "Prohibited" },
};

function drawbackSummary(f: LineFacts): string {
  if (!f.drawback) return "—";
  if (f.drawback.unambiguous) return `${f.drawback.items[0].ratePct}%`;
  const rates = f.drawback.items.map((i) => i.ratePct);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  return lo === hi ? `${lo}%` : `${lo}–${hi}%`;
}

export default async function ExportLinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = codeFromSlug(slug);
  if (!code) notFound();
  const f = factsFor(code);
  if (!f) notFound();

  // A hand-edited or stale description tail resolves to the right line, then
  // sends the reader (and the crawler) to the one canonical address for it.
  const canonical = pathForLine(f.line);
  if (`/export/${slug}` !== canonical) permanentRedirect(canonical);

  const policy = POLICY[f.line.policy] ?? POLICY.Free;
  const chapter = lookupHsCode(f.line.code.slice(0, 2));
  const heading = lookupHsCode(f.line.code.slice(0, 4));
  const sub = lookupHsCode(f.line.hsParent);

  return (
    <div className="bg-background">
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `Can ${f.line.description} be exported from India?`,
              acceptedAnswer: {
                "@type": "Answer",
                text:
                  `Under ITC-HS ${f.line.code}, ${f.line.description} is ${f.line.policy} to ` +
                  `export from India.${f.line.condition ? ` ${f.line.condition}` : ""}`,
              },
            },
            ...(f.rodtep
              ? [
                  {
                    "@type": "Question",
                    name: `What is the RoDTEP rate for HS ${f.line.code}?`,
                    acceptedAnswer: { "@type": "Answer", text: describeRodtep(f.rodtep) },
                  },
                ]
              : []),
            {
              "@type": "Question",
              name: `What is the GST rate on ${f.line.description}?`,
              acceptedAnswer: { "@type": "Answer", text: describeGst(f.gst) },
            },
          ],
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <section className="bg-navy px-6 py-12 sm:px-10">
        <div className="mx-auto max-w-[1080px]">
          <nav className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
            <Link href="/tools" className="hover:text-artha-gold hover:underline">
              Export toolkit
            </Link>
            <span>/</span>
            <span className="text-white/60">Chapter {f.line.code.slice(0, 2)}</span>
            <span>/</span>
            <span className="text-white/60">HS {f.line.hsParent}</span>
          </nav>

          <div className="font-mono text-[2rem] font-bold tracking-[0.08em] text-white sm:text-[2.6rem]">
            {f.line.code.slice(0, 6)}
            <span className="text-artha-gold">{f.line.code.slice(6)}</span>
          </div>
          <h1 className="mt-3 max-w-[780px] font-heading text-[1.6rem] font-bold leading-tight text-white sm:text-[2rem]">
            Export {f.line.description} from India
          </h1>
          <p className="mt-3 max-w-[620px] text-[14.5px] leading-relaxed text-white/55">
            Export policy, GST, RoDTEP and Duty Drawback for ITC-HS {f.line.code}, taken
            from the notifications that set them. Unit of quantity: {f.line.unit}.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1080px] px-6 sm:px-10">
        {/* ── Can you export it ──────────────────────────────────────────── */}
        <section className="border-b border-text-muted/25 py-10">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
            Can you export it?
          </h2>
          <div className={`flex items-center gap-2 text-[1.4rem] font-bold ${policy.tone}`}>
            <policy.Icon size={22} strokeWidth={2.5} />
            {policy.label}
          </div>
          {f.line.condition && (
            <p className="mt-4 max-w-[680px] border-l-2 border-artha-gold py-1 pl-4 text-[14px] leading-relaxed text-text-body">
              {f.line.condition}
            </p>
          )}
        </section>

        {/* ── What India pays back ───────────────────────────────────────── */}
        <section className="border-b border-text-muted/25 py-10">
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
            What India pays back
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Figure
              label="GST"
              value={
                f.gst.unambiguous
                  ? `${f.gst.candidates[0]?.rate}%`
                  : f.gst.candidates.map((c) => `${c.rate}%`).join(" / ")
              }
            />
            <Figure
              label="RoDTEP"
              value={f.rodtep ? `${f.rodtep.notifiedRatePct}%` : "—"}
              sub={f.rodtep ? "of FOB, notified rate" : "No rate scheduled for this line"}
            />
            <Figure
              label="Duty drawback"
              value={drawbackSummary(f)}
              sub={
                f.drawback && !f.drawback.unambiguous
                  ? `${f.drawback.items.length} items under heading ${f.drawback.heading}`
                  : undefined
              }
            />
          </div>
          <div className="mt-7 flex flex-col gap-4">
            <Note term="GST">{describeGst(f.gst)}</Note>
            {f.rodtep && <Note term="RoDTEP">{describeRodtep(f.rodtep)}</Note>}
            {f.drawback && <Note term="Duty drawback">{describeDrawback(f.drawback)}</Note>}
          </div>
        </section>

        {/* ── Where the code sits ────────────────────────────────────────── */}
        <section className="border-b border-text-muted/25 py-10">
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
            Where this code sits
          </h2>
          <dl className="flex flex-col">
            {[
              { at: f.line.code.slice(0, 2), label: "Chapter", title: chapter?.description },
              { at: f.line.code.slice(0, 4), label: "Heading", title: heading?.description },
              { at: f.line.hsParent, label: "Subheading", title: sub?.description },
              { at: f.line.code, label: "Tariff line", title: f.line.description },
            ]
              .filter((r) => r.title)
              .map((r) => (
                <div
                  key={r.at}
                  className="flex flex-col gap-1 border-b border-text-muted/25 py-3.5 sm:flex-row sm:gap-8"
                >
                  <dt className="w-32 shrink-0 font-mono text-[13px] font-bold text-text-heading">
                    {r.at}
                    <span className="ml-2 font-normal uppercase tracking-wider text-text-muted">
                      {r.label}
                    </span>
                  </dt>
                  <dd className="text-[13.5px] leading-snug text-text-body">{r.title}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-4 text-[13px] text-text-secondary">
            The first six digits are the same in every country you ship to.{" "}
            <span className="font-semibold text-[#8A6310] dark:text-artha-gold">
              The last two are India&apos;s alone.
            </span>
          </p>
        </section>

        {/* ── Onward: the destination side lives in the tool ─────────────── */}
        <section className="border-b border-text-muted/25 py-10">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
            What your buyer pays
          </h2>
          <p className="mb-6 max-w-[620px] text-[14.5px] leading-relaxed text-text-body">
            Import duty, VAT and trade-agreement eligibility depend on where you ship. Run
            this line against 80 markets — or price a single one — in the toolkit.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/tools?hs=${f.line.code}`}
              className="group inline-flex items-center gap-2 bg-navy px-6 py-3.5 font-heading text-[14px] font-semibold text-white transition-colors hover:bg-[#12294A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
            >
              Price {f.line.code} into any market
              <ArrowRight
                size={16}
                className="transition-transform motion-safe:group-hover:translate-x-1"
              />
            </Link>
          </div>
        </section>

        {/* ── Siblings: crawl paths, and genuinely the next question ─────── */}
        {f.siblings.length > 0 && (
          <section className="border-b border-text-muted/25 py-10">
            <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
              Other lines under HS {f.line.hsParent}
            </h2>
            <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              {f.siblings.map((s) => (
                <li key={s.code} className="border-b border-text-muted/20">
                  <Link
                    href={pathForLine(s)}
                    className="flex items-baseline gap-3 py-2.5 hover:bg-subtle"
                  >
                    <span className="font-mono text-[12.5px] text-[#8A6310] dark:text-artha-gold">
                      {s.code}
                    </span>
                    <span className="flex-1 text-[13px] text-text-body">{s.description}</span>
                    <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-wider text-text-muted">
                      {s.policy}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="py-8 text-[12px] leading-relaxed text-text-muted">
          Tariff line and export policy from DGFT ITC(HS) 2022. GST from Notification
          9/2025-Integrated Tax (Rate). RoDTEP from DGFT Appendix 4R. Duty Drawback from CBIC
          77/2023-Cus (N.T.). Bundled and updated periodically, never fetched live — rates
          change by notification, so confirm before you ship or file. Nothing here is legal or
          tax advice.
        </p>
      </div>
    </div>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-text-muted/25 bg-card px-5 py-6">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-text-muted">
        {label}
      </div>
      <div className="mt-3 font-mono text-[2.1rem] font-bold leading-none tracking-tight text-text-heading">
        {value}
      </div>
      {sub && <div className="mt-3 text-[12px] leading-snug text-text-secondary">{sub}</div>}
    </div>
  );
}

function Note({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p className="text-[13px] leading-relaxed text-text-secondary">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-heading">
        {term}
      </span>
      <span className="mx-2 text-text-muted">—</span>
      {children}
    </p>
  );
}
