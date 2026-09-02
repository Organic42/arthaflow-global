import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * The diligence page.
 *
 * Not a mission statement. This exists because the people who need convincing —
 * investors, incubator committees, a manufacturer deciding whether to trust a
 * duty figure — arrive already able to read a marketing page and discount it.
 * What they cannot discount is a checkable claim.
 *
 * So the page is built like the product's own output: every figure carries the
 * source it came from, and the centrepiece is a list of numbers we decided NOT
 * to produce. An about page whose most prominent section is what the product
 * refuses to do is a strange thing to build, and it is the single most
 * persuasive thing we can put in front of someone doing diligence, because it
 * is the one claim a competitor cannot copy by writing better copy.
 *
 * RULE FOR ANYONE EDITING THIS PAGE. Every number here is read out of the
 * codebase, not recalled. If you change a dataset, change it here, and if you
 * cannot name the source for something you want to add, that is the signal not
 * to add it.
 */

export const metadata: Metadata = {
  // The root layout appends " | ArthaFlow Global", so naming the brand here
  // would print it twice.
  title: "About",
  description:
    "Who builds ArthaFlow, where every number comes from, and the figures we refuse to publish because no source supports them.",
  alternates: { canonical: "/about" },
};

/** Each row is a dataset the product answers from, and where it came from. */
const provenance = [
  {
    what: "Indian tariff lines, with export policy",
    scale: "12,310",
    source: "DGFT ITC(HS) 2022 Schedule 2",
    note: "12,087 Free · 130 Restricted · 93 Prohibited",
  },
  {
    what: "India's export values, per line, per year",
    scale: "12,402",
    source: "DGCIS, Department of Commerce",
    note: "Seven financial years. Totals reconcile to India's published book.",
  },
  {
    what: "International nomenclature",
    scale: "6,939",
    source: "UN Comtrade HS 2022 reference",
    note: "Vendored, so a resolved code is guaranteed to exist.",
  },
  {
    what: "RoDTEP rebate rates",
    scale: "10,610",
    source: "DGFT Appendix 4R",
    note: "Amendment chain replayed, reproducing the official counts.",
  },
  {
    what: "Duty Drawback rates",
    scale: "2,123",
    source: "CBIC Notification 77/2023-Cus (N.T.)",
    note: "Across 1,014 headings.",
  },
  {
    what: "Destinations priced",
    scale: "82",
    source: "UNCTAD TRAINS via World Bank WITS",
    note: "Every reporter code verified against a live query.",
  },
  {
    what: "Import VAT and GST rates",
    scale: "67",
    source: "VATupdate and PwC, cross-checked",
    note: "Single-sourced entries say so in their own note.",
  },
  {
    what: "Trade agreements",
    scale: "16",
    source: "DGFT and treaty texts",
    note: "Status tracked separately — only in-force can be claimed.",
  },
];

/**
 * The signature section. Each is a real decision, and each cost us a feature a
 * competitor will happily ship.
 */
const refusals = [
  {
    q: "What Duty Drawback rate applies to my leather bags?",
    tempting: "2.4%",
    a: "The rate is somewhere between 1.5% and 3.5%. Your broker decides which.",
    why:
      "The Drawback Schedule carries its own numbering, following the Customs Tariff only to four digits and then subdividing on its own terms. Not one of its 340 eight-digit codes is a valid ITC-HS line. Heading 6302 spans five items at different rates, none of which map onto a tariff line, so returning one would be inventing a join that does not exist. Where a heading carries a single rate — 781 of them do — we answer precisely.",
  },
  {
    q: "What will my buyer pay under the India–UAE trade agreement?",
    tempting: "0%",
    a: "CEPA is in force and your buyer likely pays less. We don't hold the rate.",
    why:
      "No reachable source publishes preferential rates. WITS TRAINS serves none through its SDMX endpoint — verified against USA–Mexico under USMCA, which would certainly carry data if the endpoint served preferential lines at all. India's own CEPA schedules sit in annexes behind dead links. A guessed preferential rate is the worst number this product could produce, because it is precisely the one a manufacturer would price a shipment on.",
  },
  {
    q: "What RoDTEP rate will I actually receive?",
    tempting: "1.7%",
    a: "The notified rate is 3.4%. DGFT currently limits benefits to 50% of it.",
    why:
      "Halving the notified rate would produce one clean number, and it would be wrong the moment the limitation changes — it has already been extended once. So the notified rate and the limitation are stored and shown as two separate facts, and the product never multiplies them together. A single figure here would look more authoritative and rot silently.",
  },
];

/**
 * Two founders. Kept as data rather than prose so neither is described in a
 * shape the other is not — a page that gives one person three paragraphs and
 * the other a line is making a claim about the company whether it means to or
 * not.
 */
const founders = [
  {
    name: "Sarthak Wage",
    role: "Founder & CEO",
    owns: "Data layer, tariff engine, product",
    linkedin: "https://www.linkedin.com/in/sarthak-wage-993b5a282/",
    facts: [
      ["Previously", "CTO of a 3D design studio — raised multiple funding rounds, revenue to seven figures"],
      ["Studied", "K. J. Somaiya College of Engineering, Vidyavihar"],
      ["Builds", "The datasets, the tariff engine, and the landed-cost arithmetic"],
    ],
    bio:
      "Builds the parts of ArthaFlow that have to be right rather than merely convincing: the tariff datasets and the scripts that construct them, the classification engine, and the arithmetic a manufacturer prices a shipment on.",
  },
  {
    name: "Sameer Morya",
    role: "Co-Founder & CTO",
    owns: "Export Saathi, AI architecture",
    linkedin: null,
    facts: [
      ["Previously", "SeekMyCOURSE"],
      ["Route in", "Strategy and operations, into AI architecture"],
      ["Builds", "Export Saathi and the agent layer above the data"],
    ],
    bio:
      "Owns the layer a manufacturer actually talks to. Export Saathi turns a plain question about someone's own goods into a sequence of queries against real trade data — and, harder, into an answer that says where the evidence stops.",
  },
];

const verify = [
  {
    label: "The product",
    href: "/tools",
    text: "Classify a product and price it into any of 82 markets. No sign-up.",
  },
  {
    label: "The data, page by page",
    href: "/export/growing",
    text: "Which of India's export lines are rising, and which are dying.",
  },
  {
    label: "The source code",
    href: "https://github.com/Organic42/arthaflow-global",
    text: "Every dataset builder, every test, every decision recorded in the commit log.",
    external: true,
  },
];

export default function AboutPage() {
  return (
    <>
      {/* ── The thesis ─────────────────────────────────────────────────── */}
      <section className="bg-navy px-6 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-[1000px]">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-artha-gold">
            About ArthaFlow Global
          </p>
          <h1 className="mt-6 max-w-[18ch] font-heading text-[34px] font-bold leading-[1.1] tracking-tight text-white sm:text-[52px]">
            We don&apos;t publish a number we can&apos;t trace.
          </h1>
          <p className="mt-7 max-w-[62ch] text-[15.5px] leading-relaxed text-white/70 sm:text-[17px]">
            Export decisions are made on figures — a duty rate, a rebate, a landed
            cost. A wrong one is expensive and invisible, because a wrong duty
            rate looks exactly like a right one. Most trade tools answer every
            question. We answer the ones we can source, and say plainly where the
            evidence runs out.
          </p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-sm bg-white/10 sm:grid-cols-3">
            {[
              ["Never invented", "An HS code. The model picks from the real nomenclature or it fails."],
              ["Never averaged", "Two sources that disagree stay disagreeing, and we say which is which."],
              ["Never implied", "A rate is dated. If we last checked it in June, the page says June."],
            ].map(([head, body]) => (
              <div key={head} className="bg-navy px-6 py-7">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-artha-gold">
                  {head}
                </p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Provenance ─────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-text-muted">
            Where the answers come from
          </p>
          <h2 className="mt-5 max-w-[24ch] font-heading text-[26px] font-bold leading-tight tracking-tight text-text-heading sm:text-[34px]">
            Eight datasets, each built from its primary source.
          </h2>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-text-body">
            Not scraped from a competitor, not bought from an aggregator, not
            asked of a language model. Each is parsed from the notification or
            schedule that publishes it, by a script in the repository, and
            re-checked against published totals before it ships.
          </p>

          <div className="mt-12 border-t border-text-muted/25">
            {provenance.map((r) => (
              <div
                key={r.what}
                className="grid gap-x-6 gap-y-2 border-b border-text-muted/25 py-5 sm:grid-cols-[1fr_auto] sm:items-baseline"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-text-heading">{r.what}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                    {r.note}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
                    {r.source}
                  </p>
                </div>
                <p className="font-mono text-[26px] font-bold tabular-nums tracking-tight text-text-heading sm:text-right">
                  {r.scale}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-[62ch] text-[13.5px] leading-relaxed text-text-secondary">
            The arithmetic built on top of these carries{" "}
            <span className="font-mono font-semibold text-text-heading">134+</span>{" "}
            assertions, each pinned to a value computed by hand. They are checked
            by deliberately breaking the calculation: if charging US duty on the
            wrong basis, or compounding VAT on the wrong value, does not fail the
            suite, the suite is not doing its job.
          </p>
          <p className="mt-4 max-w-[62ch] text-[13.5px] leading-relaxed text-text-secondary">
            That standard was set by getting it wrong once. An early importer
            read DGCIS&apos;s comma-formatted values inside a bare exception
            handler and silently turned each one into a zero; the national total
            came out 13% light and looked entirely plausible. The test meant to
            catch it accepted any figure between $250bn and $600bn, so it passed.
            Both the parser and the test were rewritten.
          </p>
        </div>
      </section>

      {/* ── Founder ────────────────────────────────────────────────────── */}
      <section className="bg-subtle px-6 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-text-muted">
            Who builds it
          </p>
          <h2 className="mt-5 max-w-[26ch] font-heading text-[26px] font-bold leading-tight tracking-tight text-text-heading sm:text-[34px]">
            Two founders, and one standard applied to both halves.
          </h2>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-text-body">
            The conviction the company is built on is narrow and unfashionable: a
            trade tool earns trust by what it declines to answer. Every refusal on
            this page cost a feature a competitor ships without hesitation, and
            each is recorded in the codebase with the reasoning beside it —
            because a decision that is not written down gets quietly reversed by
            whoever opens the file next.
          </p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-sm bg-text-muted/25 md:grid-cols-2">
            {founders.map((f) => (
              <div key={f.name} className="bg-background p-7 sm:p-8">
                <h3 className="font-heading text-[21px] font-bold tracking-tight text-text-heading">
                  {f.name}
                </h3>
                <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-artha-gold">
                  {f.role} · {f.owns}
                </p>

                <p className="mt-5 text-[14.5px] leading-relaxed text-text-body">
                  {f.bio}
                </p>

                <dl className="mt-6 space-y-3.5 border-l-2 border-artha-gold pl-4">
                  {f.facts.map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
                        {k}
                      </dt>
                      <dd className="mt-1 text-[13.5px] leading-snug text-text-heading">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>

                {f.linkedin && (
                  <Link
                    href={f.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-artha-gold underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    LinkedIn <ArrowUpRight size={13} aria-hidden />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The signature: what we refused to ship ─────────────────────── */}
      <section className="px-6 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-text-muted">
            What we refused to ship
          </p>
          <h2 className="mt-5 max-w-[26ch] font-heading text-[26px] font-bold leading-tight tracking-tight text-text-heading sm:text-[34px]">
            Three questions the product will not answer.
          </h2>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-text-body">
            Each of these has an answer a competitor is comfortable giving. We
            looked for the source, could not find one that holds, and shipped the
            refusal instead. This is the part of the product that is hardest to
            copy, because copying it means giving something up.
          </p>

          <div className="mt-12 space-y-px overflow-hidden rounded-sm bg-text-muted/25">
            {refusals.map((r) => (
              <div key={r.q} className="bg-background px-0 py-9 sm:px-7">
                <p className="font-heading text-[17px] font-semibold leading-snug text-text-heading sm:text-[19px]">
                  {r.q}
                </p>

                <div className="mt-5 flex flex-wrap items-stretch gap-x-8 gap-y-5">
                  <div className="shrink-0">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-text-muted">
                      What we could say
                    </p>
                    <p
                      className="mt-2 font-mono text-[28px] font-bold tabular-nums tracking-tight text-text-muted/60 line-through decoration-error decoration-2"
                      aria-label={`${r.tempting}, rejected`}
                    >
                      {r.tempting}
                    </p>
                  </div>
                  <div className="min-w-[16rem] flex-1 border-l-2 border-artha-gold pl-4">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-artha-gold">
                      What we say
                    </p>
                    <p className="mt-2 text-[15px] leading-relaxed text-text-heading">
                      {r.a}
                    </p>
                  </div>
                </div>

                <p className="mt-5 max-w-[74ch] text-[13.5px] leading-relaxed text-text-secondary">
                  {r.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Verify ─────────────────────────────────────────────────────── */}
      <section className="bg-navy px-6 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-artha-gold">
            Check it yourself
          </p>
          <h2 className="mt-5 max-w-[24ch] font-heading text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[34px]">
            Don&apos;t take the page&apos;s word for it.
          </h2>
          <p className="mt-5 max-w-[62ch] text-[15px] leading-relaxed text-white/65">
            Everything above is inspectable. The tools run without an account,
            and the repository carries the builders, the tests and the reasoning.
          </p>

          <div className="mt-11 grid gap-px overflow-hidden rounded-sm bg-white/10 sm:grid-cols-3">
            {verify.map((v) => (
              <Link
                key={v.href}
                href={v.href}
                {...(v.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group bg-navy px-6 py-7 transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
              >
                <p className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-artha-gold">
                  {v.label}
                  <ArrowUpRight
                    size={13}
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
                  {v.text}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
