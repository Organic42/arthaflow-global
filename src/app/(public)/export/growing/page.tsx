import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { JsonLdScript } from "@/components/arthaflow/json-ld";
import { formatUsdMn, INDIA_EXPORTS_SOURCE } from "@/lib/hs/india-exports";
import {
  fastestGrowing,
  biggestGainers,
  fastestDeclining,
  growthTableSize,
  GROWTH_YEARS,
  MATERIALITY_FLOOR_USD_MN,
  type GrowthRow,
} from "@/lib/hs/export-growth";

/**
 * Which Indian export lines are growing — see lib/hs/export-growth.ts for the
 * materiality floors and why the whole ranking depends on them.
 *
 * Fully static: the underlying figures are vendored and change when DGCIS is
 * re-ingested, not by the hour. Server-rendered with no client JavaScript, so
 * a crawler that runs no JS sees the entire ranking.
 */

export const revalidate = 86400;

const TITLE = "India's fastest-growing export lines";
const SUMMARY =
  `Every Indian tariff line ranked by seven-year compound growth, from DGCIS customs ` +
  `statistics. Only lines above $${MATERIALITY_FLOOR_USD_MN}m in both the first and last ` +
  `year, so the rates are measured off real trade rather than rounding.`;

export const metadata: Metadata = {
  title: `${TITLE} — FY${GROWTH_YEARS[0]} to FY${GROWTH_YEARS[GROWTH_YEARS.length - 1]}`,
  description: SUMMARY,
  alternates: { canonical: "/export/growing" },
};

function Row({ row, rank, mode }: { row: GrowthRow; rank: number; mode: "rate" | "value" }) {
  const down = row.cagrPct < 0;
  return (
    <li>
      <Link
        href={row.href}
        className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-text-muted/25 px-2 py-3.5 transition-colors hover:bg-subtle sm:grid-cols-[2rem_minmax(0,1fr)_9rem_7rem]"
      >
        <span className="font-mono text-[11px] tabular-nums text-text-muted">{rank}</span>

        <span className="min-w-0">
          <span className="block truncate text-[14px] text-text-heading">
            {row.description}
            {row.context && (
              <span className="text-text-secondary"> · {row.context}</span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-3 font-mono text-[11px] text-text-muted">
            <span>{row.code}</span>
            <span>
              {formatUsdMn(row.firstUsdMn)} → {formatUsdMn(row.latestUsdMn)}
            </span>
            {/* A line that climbed every year is a different proposition from
                one that spiked once, and the rate alone cannot say which. */}
            <span>
              up in {row.upYears} of {row.totalSteps} years
            </span>
          </span>
        </span>

        <span className="hidden text-right sm:block">
          <span
            className={`font-mono text-[15px] font-semibold tabular-nums ${
              down ? "text-error" : "text-[#0E7A5F] dark:text-[#34D399]"
            }`}
          >
            {row.changeUsdMn > 0 ? "+" : ""}
            {formatUsdMn(Math.abs(row.changeUsdMn))}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
            {mode === "value" ? "added" : down ? "lost" : "added"}
          </span>
        </span>

        <span className="text-right">
          <span
            className={`font-mono text-[17px] font-bold tabular-nums ${
              down ? "text-error" : "text-[#0E7A5F] dark:text-[#34D399]"
            }`}
          >
            {row.cagrPct > 0 ? "+" : ""}
            {row.cagrPct}%
          </span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
            a year
          </span>
        </span>
      </Link>
    </li>
  );
}

function Table({
  eyebrow,
  heading,
  blurb,
  rows,
  mode,
  Icon,
}: {
  eyebrow: string;
  heading: string;
  blurb: string;
  rows: GrowthRow[];
  mode: "rate" | "value";
  Icon: typeof TrendingUp;
}) {
  return (
    <section className="border-t border-text-muted/25 pb-12 pt-10">
      <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
        <Icon size={14} />
        {eyebrow}
      </div>
      <h2 className="mb-2 text-[19px] font-bold text-text-heading">{heading}</h2>
      <p className="mb-6 max-w-[680px] text-[13.5px] leading-relaxed text-text-secondary">
        {blurb}
      </p>
      <ol className="border-t border-text-muted/25">
        {rows.map((r, i) => (
          <Row key={r.code} row={r} rank={i + 1} mode={mode} />
        ))}
      </ol>
    </section>
  );
}

export default function GrowingPage() {
  const first = GROWTH_YEARS[0];
  const last = GROWTH_YEARS[GROWTH_YEARS.length - 1];
  const growing = fastestGrowing(25);
  const gainers = biggestGainers(25);
  const declining = fastestDeclining(15);
  const ranked = growthTableSize();

  return (
    <div className="bg-background">
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: TITLE,
          description: SUMMARY,
          temporalCoverage: `${first}/${last}`,
          creator: { "@type": "Organization", name: "ArthaFlow Global" },
          isBasedOn: {
            "@type": "Dataset",
            name: INDIA_EXPORTS_SOURCE.name,
            url: INDIA_EXPORTS_SOURCE.url,
          },
        }}
      />

      <section className="bg-navy px-6 py-14 sm:px-10">
        <div className="mx-auto max-w-[1080px]">
          <nav className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">
            <Link href="/tools" className="hover:text-artha-gold hover:underline">
              Export toolkit
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white/60">Growth</span>
          </nav>
          <h1 className="max-w-[760px] font-heading text-[2rem] font-bold leading-[1.05] tracking-tight text-white sm:text-[2.8rem]">
            {TITLE}
          </h1>
          <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-white/60">
            {ranked.toLocaleString()} tariff lines ranked on India&apos;s own customs
            statistics, FY{first} to FY{last}. Every figure links to the line it came from.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1080px] px-6 sm:px-10">
        <Table
          eyebrow="By rate"
          heading="Growing fastest"
          blurb={`Compound annual growth from FY${first} to FY${last}. A high rate on a small line is easy to achieve and hard to act on, so both the starting and ending year must clear $${MATERIALITY_FLOOR_USD_MN}m.`}
          rows={growing}
          mode="rate"
          Icon={TrendingUp}
        />

        <Table
          eyebrow="By value"
          heading="Adding the most dollars"
          blurb="The same seven years ranked by absolute growth instead. These are usually different lines: a big base growing steadily adds more than a small one doubling, and both are worth knowing about."
          rows={gainers}
          mode="value"
          Icon={TrendingUp}
        />

        <Table
          eyebrow="By rate"
          heading="Shrinking fastest"
          blurb="Included on purpose. A list of only the winners is a marketing asset — a manufacturer choosing what to make needs to know which lines are going away, and no free source publishes that either."
          rows={declining}
          mode="rate"
          Icon={TrendingDown}
        />

        {/* ── Method. The ranking is only worth anything if it can be checked ── */}
        <section className="border-t border-text-muted/25 pb-12 pt-10">
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
            How this is calculated
          </h2>
          <div className="flex max-w-[720px] flex-col gap-4 text-[13.5px] leading-relaxed text-text-secondary">
            <p>
              Compound annual growth between FY{first} and FY{last}, on India&apos;s total
              exports of each 8-digit tariff line. The source is DGCIS, the Department of
              Commerce&apos;s own customs statistics, in US dollars.
            </p>
            <p>
              <span className="font-semibold text-text-heading">
                Only lines above ${MATERIALITY_FLOOR_USD_MN}m in both the first and last year
                are ranked.
              </span>{" "}
              That excludes most of the dataset, and it is the most important thing on this
              page. Without a floor on the starting year the list fills with rounding errors:
              one line runs $0.00m for six years, records $105m once, and scores 472% a year.
              The arithmetic is right and it describes nothing.
            </p>
            <p>
              Growth rate and dollars added are ranked separately rather than blended. A line
              adding $400m at 12% a year and one adding $40m at 60% are both interesting, and
              they are not the same fact.
            </p>
            <p>
              These are national totals. They say how much India sells of a line — never who
              buys it, and never what any one exporter achieved.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-text-muted/25 py-10">
          <p className="max-w-[420px] text-[14.5px] leading-relaxed text-text-body">
            Found a line worth making? Price it into any of 80 markets.
          </p>
          <Link
            href="/tools"
            className="group inline-flex items-center gap-2 bg-navy px-6 py-3.5 font-heading text-[14px] font-semibold text-white transition-colors hover:bg-[#12294A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
          >
            Open the export toolkit
            <ArrowRight
              size={16}
              className="transition-transform motion-safe:group-hover:translate-x-1"
            />
          </Link>
        </div>

        <p className="border-t border-text-muted/25 py-8 text-[12px] leading-relaxed text-text-muted">
          {INDIA_EXPORTS_SOURCE.name}. Values in {INDIA_EXPORTS_SOURCE.unit}. Bundled and
          updated periodically, never fetched live. Nothing on this page is investment,
          legal or tax advice.
        </p>
      </div>
    </div>
  );
}
