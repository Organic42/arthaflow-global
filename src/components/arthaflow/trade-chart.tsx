"use client";

/**
 * TradeChart — the "visual" half of Export Saathi.
 *
 * Renders the structured data Saathi's trade tools return (the `toolCalls`
 * array from /api/chat) as compact, theme-matched charts inside a chat bubble.
 * Pure CSS/SVG, no chart library — keeps the bundle light and the look on-brand
 * (navy + gold). Gracefully renders nothing for failed or empty tool calls.
 */

type CountryValue = {
  iso3: string;
  name: string;
  valueUsdM: number;
  sharePct: number;
  rank: number;
};

type TrendPoint = {
  year: number;
  valueUsdM: number;
  growthPct: number | null;
};

// Loose shape — mirrors ToolResult<...> from the trade tools without importing
// server code into this client component.
export type TradeToolCall = {
  tool: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
};

// Format a USD-millions figure compactly: $12.1B / $340M.
function fmtUsdM(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  if (m >= 1) return `$${Math.round(m)}M`;
  return `$${m.toFixed(1)}M`;
}

function BarList({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: CountryValue[];
}) {
  const max = Math.max(...rows.map((r) => r.valueUsdM), 1);
  return (
    <div className="mt-2 rounded-xl border border-artha-gold/20 bg-navy/60 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-artha-gold">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-white/40">{subtitle}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.iso3 + r.rank} className="text-[11px]">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <span className="truncate text-white/80">
                {r.rank}. {r.name}
              </span>
              <span className="shrink-0 font-semibold text-white">
                {fmtUsdM(r.valueUsdM)}
                <span className="ml-1 font-normal text-white/40">
                  {r.sharePct}%
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-artha-gold/70 to-artha-gold"
                style={{ width: `${Math.max((r.valueUsdM / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle?: string;
  points: TrendPoint[];
}) {
  const max = Math.max(...points.map((p) => p.valueUsdM), 1);
  return (
    <div className="mt-2 rounded-xl border border-artha-gold/20 bg-navy/60 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-artha-gold">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-white/40">{subtitle}</span>
        )}
      </div>
      <div className="flex h-20 items-end justify-between gap-1.5">
        {points.map((p) => (
          <div
            key={p.year}
            className="flex flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[9px] font-medium text-white/70">
              {fmtUsdM(p.valueUsdM)}
            </span>
            <div
              className="w-full rounded-t bg-gradient-to-t from-artha-gold/50 to-artha-gold"
              style={{ height: `${Math.max((p.valueUsdM / max) * 100, 3)}%` }}
            />
            <span className="text-[9px] text-white/40">{p.year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TradeCharts({ toolCalls }: { toolCalls?: TradeToolCall[] }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  const charts = toolCalls
    .filter((t) => t.result?.ok)
    .map((t, i) => {
      const data = t.result.data;
      const yr = data?.year ? `${data.year}` : undefined;
      const hs = data?.hsCode ? `HS ${data.hsCode}` : "";

      switch (t.tool) {
        case "getTopImporters":
          if (!data?.countries?.length) return null;
          return (
            <BarList
              key={i}
              title="Top import markets"
              subtitle={[hs, yr].filter(Boolean).join(" · ")}
              rows={data.countries}
            />
          );
        case "getTopExporters":
          if (!data?.exporters?.length) return null;
          return (
            <BarList
              key={i}
              title="Top exporters (competition)"
              subtitle={[hs, yr].filter(Boolean).join(" · ")}
              rows={data.exporters}
            />
          );
        case "getIndiaExports": {
          if (!data?.topDestinations?.length) return null;
          // WITS figures are chapter-group level, not the exact HS line —
          // label them honestly so the chart can't be misread.
          const sub =
            data.source === "wits"
              ? [data.groupLabel, yr, "World Bank"].filter(Boolean).join(" · ")
              : [hs, yr].filter(Boolean).join(" · ");
          return (
            <BarList
              key={i}
              title="India's export destinations"
              subtitle={sub}
              rows={data.topDestinations}
            />
          );
        }
        case "getTradeTrend": {
          if (!data?.points?.length) return null;
          const world = data.partner === "World";
          const title = world
            ? `${data.reporter} — ${data.flow === "M" ? "import demand" : "exports"}`
            : `${data.reporter} → ${data.partner}`;
          return (
            <TrendChart
              key={i}
              title={title}
              subtitle={[hs].filter(Boolean).join(" · ")}
              points={data.points}
            />
          );
        }
        default:
          return null;
      }
    })
    .filter(Boolean);

  if (charts.length === 0) return null;
  return <div className="space-y-1">{charts}</div>;
}
