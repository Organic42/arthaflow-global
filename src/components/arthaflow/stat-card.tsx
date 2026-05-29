"use client";

import CountUp from "react-countup";

interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  animate?: boolean;
}

function parseValue(s: string) {
  // Match optional prefix (non-digits), the number, and optional suffix
  const match = s.match(/^([^\d-]*)(-?\d+(?:[.,]\d+)?)(.*)$/);
  if (match) {
    const [, prefix, num, suffix] = match;
    return {
      prefix,
      num: parseFloat(num.replace(",", "")),
      numSuffix: suffix,
      hasDecimals: num.includes(".") || num.includes(","),
    };
  }
  return null;
}

export function StatCard({
  label,
  value,
  suffix,
  color = "text-action-blue",
  animate = true,
}: StatCardProps) {
  const parsed = animate ? parseValue(value) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-4xl font-bold leading-tight ${color}`}>
          {parsed ? (
            <>
              {parsed.prefix}
              <CountUp
                end={parsed.num}
                duration={1.4}
                decimals={parsed.hasDecimals ? 1 : 0}
                separator=","
              />
              {parsed.numSuffix}
            </>
          ) : (
            value
          )}
        </span>
        {suffix && <span className="text-sm text-text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
