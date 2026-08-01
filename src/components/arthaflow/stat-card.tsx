"use client";

import { useEffect, useState } from "react";

interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  animateValue?: boolean;
}

function parseValue(s: string) {
  const match = s.match(/^([^\d-]*)(-?\d+(?:[.,]\d+)?)(.*)$/);
  if (match) {
    const [, prefix, num, suffix] = match;
    return {
      prefix,
      num: parseFloat(num.replace(",", "")),
      numSuffix: suffix,
      decimals: /[.,]/.test(num) ? 1 : 0,
    };
  }
  return null;
}

function CountNumber({
  target,
  prefix,
  suffix,
  decimals,
}: {
  target: number;
  prefix: string;
  suffix: string;
  decimals: number;
}) {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    // Nothing to animate towards zero — the render below reads `target`
    // directly in that case, so setting state here would only have forced an
    // extra render to reach a value we already know.
    if (target === 0) return;

    let raf = 0;
    const duration = 1100;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // Derived, not stored: a zero target renders zero without a state round-trip,
  // and a stale `display` from a previous non-zero target cannot leak through.
  const value = target === 0 ? 0 : display;

  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString("en-IN");

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  color = "text-action-blue",
  animateValue = true,
}: StatCardProps) {
  const parsed = animateValue ? parseValue(value) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-4xl font-bold leading-tight ${color}`}>
          {parsed ? (
            <CountNumber
              target={parsed.num}
              prefix={parsed.prefix}
              suffix={parsed.numSuffix}
              decimals={parsed.decimals}
            />
          ) : (
            value
          )}
        </span>
        {suffix && <span className="text-sm text-text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
