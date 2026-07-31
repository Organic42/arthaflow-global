"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Info, AlertTriangle } from "lucide-react";

/**
 * Public landed-cost calculator.
 *
 * The product surfaces every layer built underneath it — classification, the
 * Indian tariff line and its export policy, the destination's duty, VAT, RoDTEP
 * and any trade agreement — in one screen a manufacturer can use before signing
 * up.
 *
 * The flow mirrors how Saathi works, deliberately: search returns a SHORTLIST
 * and the user chooses. Neither the model nor the form picks an HS code, because
 * every number downstream derives from it.
 */

interface TariffLine {
  code: string;
  description: string;
  policy: string;
}
interface Candidate {
  code: string;
  description: string;
  lines: TariffLine[];
}
interface Destination {
  iso3: string;
  name: string;
}

interface Vat {
  label: string;
  ratePct: number;
  amountInr: number;
  recoverable: boolean;
}
interface Result {
  buyer: {
    fobInr: number;
    freightInr: number;
    insuranceInr: number;
    cifInr: number;
    dutyBasis: string;
    dutyRatePct: number;
    dutyInr: number;
    landedCostInr: number;
    upliftPct: number;
    vat: Vat | null;
    cashAtBorderInr: number;
  };
  exporter: {
    rodtepInr: number | null;
    rodtepRatePct: number | null;
    drawbackInr: number | null;
    drawbackRatePct: number | null;
    drawbackAmbiguous: boolean;
    netRealisationInr: number;
  };
  destination: { country: string; year: number };
  caveats: string[];
}

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const FIELD =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function CalculatorPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [line, setLine] = useState<TariffLine | null>(null);

  const [dest, setDest] = useState("ARE");
  const [fob, setFob] = useState("");
  const [freight, setFreight] = useState("");
  const [insurance, setInsurance] = useState("");
  const [qty, setQty] = useState("");

  const [searching, setSearching] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch("/api/tariff/landed-cost")
      .then((r) => r.json())
      .then((d) => setDestinations(d.destinations ?? []))
      .catch(() => setDestinations([]));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResult(null);
    setPicked(null);
    setLine(null);
    try {
      const r = await fetch(`/api/tariff/landed-cost?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Search failed.");
      setCandidates(d.candidates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    if (!picked || !fob) return;
    setCalculating(true);
    setError(null);
    try {
      const r = await fetch("/api/tariff/landed-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hsCode: picked.code,
          itcCode: line?.code,
          destinationIso: dest,
          fobInr: Number(fob),
          freightInr: freight ? Number(freight) : undefined,
          insuranceInr: insurance ? Number(insurance) : undefined,
          quantity: qty ? Number(qty) : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Calculation failed.");
      setResult(d.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed.");
    } finally {
      setCalculating(false);
    }
  }

  const restricted = line && line.policy !== "Free";

  return (
    <section className="min-h-[70vh] bg-background px-6 pb-24 pt-14 sm:px-8">
      <div className="mx-auto max-w-[880px]">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-text-heading sm:text-4xl">
            Export Landed Cost Calculator
          </h1>
          <p className="mx-auto max-w-[560px] text-base text-text-secondary">
            What your buyer pays to land your goods — and what you actually take
            home after export incentives. Free, no sign-up.
          </p>
        </div>

        {/* ── Step 1: find the product ── */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-artha-gold text-[12px] font-bold text-navy">
              1
            </span>
            <h2 className="text-base font-bold text-text-heading">
              What are you exporting?
            </h2>
          </div>
          <form onSubmit={search} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. leather handbags, brass door handles, चमड़े के बैग"
              className="h-10"
            />
            <Button type="submit" disabled={searching} className="h-10 shrink-0 gap-1.5">
              <Search size={15} />
              {searching ? "Searching…" : "Find"}
            </Button>
          </form>

          {candidates && candidates.length === 0 && (
            <p className="mt-3 text-sm text-text-secondary">
              No match. Try the material and what the product is used for — that
              is how the customs nomenclature is written.
            </p>
          )}

          {candidates && candidates.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[13px] text-text-secondary">
                Pick the closest match. We never choose for you — every figure
                below depends on this code.
              </p>
              <div className="flex flex-col gap-2">
                {candidates.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setPicked(c);
                      setLine(c.lines[0] ?? null);
                      setResult(null);
                    }}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      picked?.code === c.code
                        ? "border-artha-gold bg-gold-bg"
                        : "border-border hover:border-artha-gold/50"
                    }`}
                  >
                    <span className="font-mono font-bold text-text-heading">
                      {c.code}
                    </span>{" "}
                    <span className="text-text-body">{c.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Indian tariff line — 8 digits, and its export policy. */}
          {picked && picked.lines.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <label className="mb-1.5 block text-[13px] font-medium text-text-heading">
                Indian tariff line (goes on your shipping bill)
              </label>
              <select
                value={line?.code ?? ""}
                onChange={(e) =>
                  setLine(picked.lines.find((l) => l.code === e.target.value) ?? null)
                }
                className={FIELD}
              >
                {picked.lines.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} — {l.description}
                    {l.policy !== "Free" ? ` [${l.policy}]` : ""}
                  </option>
                ))}
              </select>
              {restricted && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-[13px] text-red-800">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>
                    This line is <strong>{line.policy}</strong> for export. Confirm
                    the current position with DGFT or a customs broker before
                    shipping — policy is amended by notification.
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Step 2: the shipment ── */}
        {picked && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-artha-gold text-[12px] font-bold text-navy">
                2
              </span>
              <h2 className="text-base font-bold text-text-heading">
                The shipment
              </h2>
            </div>
            <form onSubmit={calculate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-heading">
                  Destination
                </label>
                <select
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className={FIELD}
                >
                  {destinations.map((d) => (
                    <option key={d.iso3} value={d.iso3}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-heading">
                  Invoice value (₹) <span className="text-red-600">*</span>
                </label>
                <Input
                  type="number"
                  value={fob}
                  onChange={(e) => setFob(e.target.value)}
                  placeholder="500000"
                  className="h-10"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-heading">
                  Freight (₹)
                </label>
                <Input
                  type="number"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                  placeholder="45000"
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-heading">
                  Marine insurance (₹)
                </label>
                <Input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  placeholder="5000"
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-heading">
                  Quantity (units)
                </label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="500"
                  className="h-10"
                />
                <p className="mt-1 text-[12px] text-text-muted">
                  Needed to apply RoDTEP&apos;s per-unit cap.
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={calculating || !fob}
                  className="h-10 w-full gap-1.5 bg-artha-gold text-navy hover:bg-artha-gold/90"
                >
                  {calculating ? "Calculating…" : "Calculate"}
                  {!calculating && <ArrowRight size={15} />}
                </Button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ── Step 3: the answer ── */}
        {result && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-artha-gold text-[12px] font-bold text-navy">
                3
              </span>
              <h2 className="text-base font-bold text-text-heading">
                Estimate for {result.destination.country}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Buyer */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-text-secondary">
                  What your buyer pays
                </h3>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <Row label="Goods" value={money(result.buyer.fobInr)} />
                  <Row label="Freight" value={money(result.buyer.freightInr)} />
                  <Row label="Insurance" value={money(result.buyer.insuranceInr)} />
                  <Row
                    label={`Duty (${result.buyer.dutyRatePct}% on ${result.buyer.dutyBasis})`}
                    value={money(result.buyer.dutyInr)}
                  />
                  <div className="mt-1.5 flex justify-between border-t border-border pt-2 font-bold text-text-heading">
                    <dt>Landed cost</dt>
                    <dd>{money(result.buyer.landedCostInr)}</dd>
                  </div>
                  <p className="text-[12px] text-text-muted">
                    {result.buyer.upliftPct}% above your invoice
                  </p>

                  {result.buyer.vat && (
                    <div className="mt-3 rounded-lg bg-blue-bg p-2.5">
                      <div className="flex justify-between text-[13px]">
                        <dt>
                          {result.buyer.vat.label} ({result.buyer.vat.ratePct}%)
                        </dt>
                        <dd>{money(result.buyer.vat.amountInr)}</dd>
                      </div>
                      <div className="mt-1 flex justify-between text-[13px] font-semibold text-text-heading">
                        <dt>Cash at the border</dt>
                        <dd>{money(result.buyer.cashAtBorderInr)}</dd>
                      </div>
                      <p className="mt-1.5 text-[12px] text-text-secondary">
                        {result.buyer.vat.recoverable
                          ? `A ${result.buyer.vat.label}-registered buyer reclaims this, so it is working capital — not a reason your price is uncompetitive.`
                          : `This is a sales tax the buyer cannot reclaim.`}
                      </p>
                    </div>
                  )}
                </dl>
              </div>

              {/* Exporter */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-text-secondary">
                  What you take home
                </h3>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <Row label="Invoice value" value={money(result.buyer.fobInr)} />
                  <Row
                    label={
                      result.exporter.rodtepRatePct !== null
                        ? `RoDTEP (${result.exporter.rodtepRatePct}%)`
                        : "RoDTEP"
                    }
                    value={
                      result.exporter.rodtepInr !== null
                        ? `+ ${money(result.exporter.rodtepInr)}`
                        : "—"
                    }
                  />
                  <Row
                    label={
                      result.exporter.drawbackRatePct !== null
                        ? `Duty Drawback (${result.exporter.drawbackRatePct}%)`
                        : "Duty Drawback"
                    }
                    value={
                      result.exporter.drawbackInr !== null
                        ? `+ ${money(result.exporter.drawbackInr)}`
                        : result.exporter.drawbackAmbiguous
                          ? "see note"
                          : "—"
                    }
                  />
                  <div className="mt-1.5 flex justify-between border-t border-border pt-2 font-bold text-text-heading">
                    <dt>Net realisation</dt>
                    <dd>{money(result.exporter.netRealisationInr)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Caveats travel with the number, never under a fold. */}
            <div className="mt-5 rounded-xl bg-background p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-text-heading">
                <Info size={14} />
                This is an estimate, not a quote
              </div>
              <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[12.5px] leading-relaxed text-text-secondary">
                {result.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2 border-t border-border pt-5 text-center">
              <p className="text-sm text-text-secondary">
                Want the export documents, market analysis and shipment help too?
              </p>
              <Link href="/login">
                <Button className="gap-1.5 bg-artha-gold text-navy hover:bg-artha-gold/90">
                  Start free <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[12px] leading-relaxed text-text-muted">
          Duties from UNCTAD TRAINS via World Bank WITS. Tariff lines and export
          policy from DGFT ITC(HS) 2022. RoDTEP from DGFT Appendix 4R, Duty
          Drawback from CBIC 77/2023-Cus (N.T.). Rates change by notification —
          confirm with a customs broker before shipping.
        </p>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="shrink-0 text-text-body">{value}</dd>
    </div>
  );
}
