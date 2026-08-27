<div align="center">

<img src="public/logo.png" width="88" alt="ArthaFlow Global" />

# ArthaFlow Global

### The operating system for global trade — starting with India's 57M unexported MSMEs.

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&size=18&duration=2600&pause=900&color=D4A843&center=true&vCenter=true&width=680&lines=Classify+the+product.+Price+the+shipment.;Find+where+in+the+world+it+actually+sells.;No+invented+HS+codes.+No+fabricated+figures.;Every+number+traced+to+a+primary+source." alt="Typing SVG" />

<br />

[![Build](https://github.com/Organic42/arthaflow-global/actions/workflows/webpack.yml/badge.svg)](https://github.com/Organic42/arthaflow-global/actions/workflows/webpack.yml)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

**[arthaflowglobal.com](https://arthaflowglobal.com)** · **[Full engineering context →](./PROJECT_CONTEXT.md)**

</div>

<br />

<div align="center">
<img src="public/port-dusk-hero.webp" width="100%" alt="Container port at dusk" />
</div>

<br />

<div align="center">

| | | | |
|:--:|:--:|:--:|:--:|
| **12,402** | **12,310** | **82** | **134+** |
| ITC-HS lines with<br/>7 years of export values | verified Indian<br/>tariff lines | destinations<br/>priced | assertions in<br/>the data suite |

</div>

<br />

## The wall

India has **57M+ registered MSMEs.** Fewer than **0.3% export.**

Not because the products aren't good enough for the world — because international
trade is a wall of HS codes, compliance paperwork, buyer discovery and logistics
decisions that a small manufacturer has no way to climb alone. A traditional export
consultant costs upwards of **₹2 lakh a year** and still does it by hand.

**ArthaFlow removes the wall.** Classify the product correctly, price the shipment
into any market, tell the manufacturer where in the world their product is actually in
demand — and get out of the way.

> 🧭 **New here?** [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) is the single source of
> truth for business, architecture and data context — written to brief a new engineer
> (or an AI assistant) from cold.

<br />

## What's live

<table>
<tr>
<td width="33%" valign="top">

### 🧠 Export Saathi
A tool-calling trade-intelligence agent. Ask "who buys leather bags in Europe" and it
queries **real** DGCIS / Comtrade / WITS data, reasons over the numbers, and renders
the answer inline. Streams its progress so you can watch which sources it consults.

</td>
<td width="33%" valign="top">

### 🏷️ HS Classification
Retrieve-then-choose against the real HS 2022 nomenclature — **6,939 vendored
entries.** The model picks from a shortlist; it *structurally cannot* invent a code.
Indic-script aliases included.

</td>
<td width="33%" valign="top">

### 💰 Landed Cost Engine
FOB → duty → VAT → RoDTEP → Drawback, both directions: what the buyer pays, what the
exporter nets. Duty basis, surcharges and treaty rates handled per destination.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### 🌍 82-Destination Coverage
MFN import duty, VAT/GST, trade agreements and above-MFN measures. Every WITS reporter
code individually verified against a live query — never scraped and trusted.

</td>
<td width="33%" valign="top">

### 📈 What India Actually Exports
**$441.5bn** across 12,402 tariff lines for FY 2025-26, reconciling to India's
published book. Powers the growth ranking: which export lines are rising, and which
are dying.

</td>
<td width="33%" valign="top">

### 📄 Document Generation
Auto-drafts the export paperwork a shipment actually needs, grounded in the classified
product and destination — no blank templates, no manual re-keying.

</td>
</tr>
</table>

<br />

## Built with

<p align="center">
<img src="https://skillicons.dev/icons?i=nextjs,react,typescript,tailwind,supabase,postgres,vercel,py,nodejs&theme=dark" alt="Tech stack" />
</p>

<div align="center">

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) · React 19 · TypeScript 5 |
| UI | Tailwind CSS 4 · shadcn-style components · Lucide icons |
| Type | Space Grotesk (headings) · DM Sans (body) · JetBrains Mono (figures) |
| Auth / DB / Storage | Supabase — Postgres with Row Level Security |
| Saathi inference | **Gemini** `gemini-3.5-flash`, via the `openai` SDK against Gemini's compatible endpoint |
| Document inference | **Groq** |
| Trade data | DGCIS (India) · UN Comtrade · World Bank WITS / UNCTAD TRAINS |
| Visuals | `cobe` (WebGL globe) · `motion` |
| Hosting | Vercel |

</div>

> ⚠️ **Next.js 16 is not the Next.js you may know.** It carries breaking changes to
> APIs, conventions and file structure. Consult `node_modules/next/dist/docs/` before
> writing framework code rather than relying on memory — see [`AGENTS.md`](./AGENTS.md).

<br />

## How a question becomes an answer

```mermaid
flowchart TD
    Q["`**\"Where can I sell cotton t-shirts?\"**`"] --> AGENT

    subgraph AGENT ["Saathi agent loop · src/lib/saathi/agent.ts"]
        direction TB
        PLAN["Model selects a tool"] --> TOOL["Tool executes"]
        TOOL --> MORE{"More<br/>needed?"}
        MORE -- yes --> PLAN
    end

    MORE -- no --> LANG["enforceLanguage()<br/><i>inspects the complete answer</i>"]
    LANG --> OUT["`**Answer + charts**`"]

    TOOL -.-> HS["HS 2022<br/>6,939 entries"]
    TOOL -.-> ITC["ITC-HS + policy<br/>12,310 lines"]
    TOOL -.-> DG["DGCIS exports<br/>12,402 x 7 FY"]
    TOOL -.-> TAR["Tariff layer<br/>82 destinations"]
    TOOL -.-> CT["Comtrade / WITS<br/>world demand"]

    AGENT -.->|"progress events"| STREAM["NDJSON stream<br/><i>first event at ~0.2s</i>"]

    classDef data fill:#0B1D3A,stroke:#D4A843,stroke-width:1px,color:#fff
    class HS,ITC,DG,TAR,CT data
```

**Progress streams, not tokens.** `enforceLanguage()` inspects the *complete* answer and
may rewrite it, so tokens cannot be committed to the screen before it runs. Streaming
the steps instead is also the better thing to show: watching *"Finding the right HS
code → Checking what India exports of this"* is watching the case for why this is not a
wrapper around a public API.

<br />

## Data provenance

Every figure in the product traces to a primary source. Nothing is inferred, averaged
across sources, or filled in when missing.

| Dataset | Scale | Source | Built by |
|---|--:|---|---|
| HS 2022 nomenclature | 6,939 entries | UN Comtrade reference | [`build-hs-codes.mjs`](./scripts/build-hs-codes.mjs) |
| ITC-HS Schedule 2 + export policy | 12,310 lines | DGFT | [`build-itchs.py`](./scripts/build-itchs.py) |
| India's export values | 12,402 codes × 7 FY | DGCIS TIA portal | [`build-india-exports.py`](./scripts/build-india-exports.py) |
| RoDTEP rebate rates | 10,610 rates | DGFT Appendix 4R | [`build-rodtep.py`](./scripts/build-rodtep.py) |
| Duty Drawback | 2,123 rates / 1,014 headings | CBIC 77/2023-Cus (N.T.) | [`build-drawback.py`](./scripts/build-drawback.py) |
| GST rates | — | CBIC notifications | [`build-gst.py`](./scripts/build-gst.py) |
| Destination MFN duty | 82 destinations | UNCTAD TRAINS via WITS | live, cached |
| Import VAT / GST | 67 rates | VATupdate + PwC, cross-checked | [`vat.ts`](./src/lib/tariff/vat.ts) |
| Trade agreements | 16 | DGFT / treaty texts | [`fta.ts`](./src/lib/tariff/fta.ts) |
| Above-MFN measures | 16 destinations | Joint statements / EC | [`surcharge.ts`](./src/lib/tariff/surcharge.ts) |

<details>
<summary><strong>The 13% shortfall — why these builders refuse to write on doubt</strong></summary>
<br />

DGCIS prints thousands separators, so a large line arrives as `"2,949.732"`. An early
version of the export-values importer called `float()` inside a bare
`except ValueError: pass`, which turned **every comma-formatted value into a silent
zero**. The national total came out at $385.7bn against a true $437.1bn — 13% light,
and entirely plausible-looking.

The test that was supposed to catch it asserted the total fell in a $250–600bn band.
The buggy figure passed comfortably.

Two changes came out of it, and they are the rule for every builder in `scripts/`:

1. **The parser refuses to write the file at all** if any value was unreadable. A
   partial dataset is worse than none, because it looks complete.
2. **Plausibility bands are not tests.** The suite now pins the national total to
   $400–500bn *and* pins individual lines to published values.

</details>

<br />

## Verification

Data bugs in this codebase have been silent and large, so the numbers that matter are
pinned to exact values rather than sanity-checked. Every expected figure is computed by
hand in a comment beside the assertion.

| Suite | Checks | Covers |
|---|--:|---|
| `npm run test:landed-cost` | **97** | Duty basis, VAT compounding, RoDTEP caps, drawback refusal, surcharge scope, treaty rates |
| `npm run test:india-exports` | **28** | DGCIS totals against India's published book, prefix aggregation |
| `npm run test:rate-limit` | **9** | Anonymous trial cap, refunds on upstream failure |
| `npm run test:hs` | — | HS retrieval regression |
| `npm run test:dgcis` | — | Per-destination aggregation |

**Tests are verified by mutation, not by passing.** A suite that only ever goes green
proves nothing. Breaking the calculation on purpose must break the suite:

| Deliberate break | Fails | Silent error it would have shipped |
|---|--:|---|
| US duty charged on CIF, not FOB | 7 | duty overstated ₹7,360 |
| VAT on CIF instead of CIF+duty | 3 | VAT understated ₹13,486 |
| RoDTEP per-unit cap ignored | 2 | rebate overstated ₹14,000 |
| Surcharge scope collapsed to two values | 4 | an 18% exposure hidden entirely |

<br />

## Quick start

**Prerequisites:** Node.js 22+, npm, and a Supabase project.

```bash
git clone https://github.com/Organic42/arthaflow-global.git
cd arthaflow-global
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

<details>
<summary><strong>Environment variables</strong></summary>
<br />

| Variable | Required | Purpose |
|---|:--:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (browser-safe) |
| `GEMINI_API_KEY` | ✅ | Saathi inference — Google AI Studio key |
| `GROQ_API_KEY` | ✅ | Document generation |
| `COMTRADE_API_KEY` | ✅ | UN Comtrade ([register free](https://comtradeplus.un.org)) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Enables trade-data caching. **Server-only — never prefix with `NEXT_PUBLIC_`** |

Without `GEMINI_API_KEY` the chat endpoint returns 503. Without `COMTRADE_API_KEY` the
trade tools degrade gracefully and report data as unavailable — they never fabricate
figures.

</details>

<details>
<summary><strong>Database setup</strong></summary>
<br />

Apply the migrations in [`supabase/migrations/`](./supabase/migrations) in order, via
the Supabase SQL Editor or CLI. They create 7 tables, 29+ RLS policies, and several
hardened functions and triggers.

</details>

<details>
<summary><strong>Scripts</strong></summary>
<br />

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:landed-cost` | Landed-cost arithmetic — run after touching `src/lib/tariff/` |
| `npm run test:india-exports` | DGCIS export-value dataset |
| `npm run test:rate-limit` | Sliding-window limiter and refunds |
| `npm run test:hs` | HS retrieval regression — run after touching `src/lib/hs/` |
| `npm run test:dgcis` | Per-destination aggregation |
| `npm run build:india-exports` | Rebuild the DGCIS export-value dataset |
| `ANALYZE=true npm run build` | Bundle composition report |

Data builders under `scripts/*.py` need `pdfplumber`.

</details>

<br />

## Architecture

```
src/
├── app/
│   ├── (public)/          Home, tools, pricing, blog, /export/[slug] SEO pages
│   ├── (auth)/            Login, onboarding
│   ├── (dashboard)/       Dashboard, products, documents, shipments, inquiries…
│   ├── (admin)/           Internal ops
│   └── api/
│       ├── chat/                  Export Saathi — NDJSON progress stream
│       ├── generate-document/     Export document generation
│       ├── hsn-search/            Tariff-line search
│       └── tariff/
│           ├── landed-cost/       Destination list + landed-cost calculation
│           └── market-rank/       Rank every market for one product
├── components/
│   ├── arthaflow/         chat-bot, trade-chart, globe, navs…
│   └── ui/                Primitives
├── lib/
│   ├── saathi/agent.ts    Tool-calling loop + progress channel
│   ├── hs/                Nomenclature, ITC-HS, RoDTEP, drawback, export values
│   ├── tariff/            destination · landed-cost · vat · fta · surcharge
│   ├── comtrade/          UN Comtrade client + trade tools
│   ├── seo/               Programmatic page generation
│   ├── supabase/          Browser, SSR and service-role clients
│   └── rate-limit.ts      In-memory sliding window
├── proxy.ts               Auth middleware — holds `publicRoutes`
└── supabase/migrations/   Schema
```

> **Adding a public page?** Add its path to `publicRoutes` in `src/proxy.ts`, or the
> auth proxy will redirect it to `/login`.

<br />

## Export Saathi — the flagship

Saathi answers the question that comes *before* "help me export" —
**"where does the world actually want my product?"**

| Tool | Answers |
|---|---|
| `classifyProduct` | "What's the HS code for my product?" |
| `lookupHs` | "Is this code real, and what does it cover?" |
| `getIndianTariffLines` | "What 8-digit code goes on my shipping bill, and can I legally export it?" |
| `getIndiaExportVolume` | "How much of this does India export, and is it growing?" |
| `getImportDuty` | "What duty will my buyer pay to land this in Germany?" |
| `calculateLandedCost` | "What does this shipment cost my buyer, and what do I net?" |
| `getTopImporters` | "Where can I sell this?" |
| `getTopExporters` | "Who am I competing against?" |
| `getTradeTrend` | "Is demand growing in this market?" |
| `getIndiaExports` | "Who buys this from India?" |

<details>
<summary><strong>Design rules — do not weaken these</strong></summary>
<br />

Each exists because of a real failure caught in testing.

1. **No fabrication.** Every country, ranking and figure must come from a successful
   tool result *in that conversation*. If a tool fails, the model may not name a
   country at all — it says the data is unavailable.
2. **Sources are disclosed.** Mirror statistics and group-level figures are labelled as
   such, never passed off as exact HS-line data.
3. **HS codes are never recalled from memory** — see below.
4. **Never "live" or "real-time" data.** Trade sources lag by months to years.

</details>

<br />

## HS classification

Saathi used to pick HS codes from model memory. For one product it variously produced
`4202`, `420222`, `4201` and `4102` — and 4102 is *raw sheep hides*. Since every trade
figure derives from the code, a wrong guess yields a confidently wrong answer the
manufacturer has no way to detect.

Classification is now **retrieve-then-choose**: search the real HS 2022 nomenclature
(6,939 entries, vendored from UN Comtrade's own reference, so any resolved code is
guaranteed valid there), hand the model a shortlist, and let it choose — **it cannot
invent a code.** The chosen code is always shown to the user for correction.

An alias layer ([`aliases.ts`](./src/lib/hs/aliases.ts)) bridges how manufacturers
speak and how the nomenclature is written, including Indic scripts — so
`"चमड़े के बैग"` resolves to `420221`.

<details>
<summary><strong>The Indian tariff line, RoDTEP, and Duty Drawback</strong></summary>
<br />

### The Indian tariff line

The international nomenclature stops at 6 digits; a shipping bill carries 8. The last
two are India's own tariff line, vendored from DGFT's ITC(HS) 2022 Schedule 2
(12,310 lines) along with each line's **export policy** — 12,087 Free, 130 Restricted,
93 Prohibited outright.

**8-digit codes must never reach a trade-data tool.** Comtrade speaks 6-digit and
answers an unrecognised code with TOTAL trade rather than an error — a silent
overstatement by orders of magnitude. Classification therefore resolves to 6 digits
([`classify.ts`](./src/lib/hs/classify.ts)) and the tariff line is a separate lookup
([`itchs.ts`](./src/lib/hs/itchs.ts)).

### RoDTEP rebate rates

10,610 rates from DGFT's Appendix 4R ([`rodtep.ts`](./src/lib/hs/rodtep.ts)) — a
percentage of FOB value, capped per unit, covering ~85% of export lines. This is money
back on a shipment, so it is the number an exporter asks for first.

The schedule is a base notification plus a chain of amendments, and
[`build-rodtep.py`](./scripts/build-rodtep.py) replays that chain rather than trusting
a single file. Its output independently reproduces the official amendment counts
(142 added, 50 omitted, 2 redescribed), which is how we know the parse is right.

**We never state an effective rate.** DGFT currently limits benefits to 50% of notified
rates, a limitation already extended once. The notified rate and the limitation are
stored and surfaced as separate facts. Collapsing them into one number produces a
figure that looks authoritative and rots silently.

### Duty Drawback — and why it's keyed differently

2,123 rates across 1,014 headings ([`drawback.ts`](./src/lib/hs/drawback.ts)), from
CBIC Notification 77/2023-Customs (N.T.).

RoDTEP is published against real 8-digit ITC-HS tariff items and joins cleanly.
**The Drawback Schedule does not.** It carries its own numbering that follows the
Customs Tariff only to 4 digits, then subdivides on its own terms:

| Drawback code level | Valid as ITC-HS |
|---|--:|
| 8-digit | **0%** (0 of 340) |
| 6-digit | 6% (51 of 925) |
| 4-digit heading | **100%** (419 of 419) |

So drawback item `42020101` is not tariff line `42022110`, though both describe leather
bags. Attaching a drawback rate to an 8-digit ITC-HS code is a fabricated join. We
resolve to the heading and return every item under it: **781 headings carry a single
rate** and answer precisely; the rest return a shortlist with the mismatch disclosed,
and the tool result forbids the model from picking one.

</details>

<br />

## Landed cost — the number a shipment is priced on

**What the buyer pays to land the goods** ([`src/lib/tariff/`](./src/lib/tariff)) — the
number that decides whether an export is worth making.

We deliberately do **not** build India's own BCD and IGST. That's what an *importer*
pays bringing goods into India, and our user is an exporter.

<details>
<summary><strong>Duty basis, VAT, agreements, and measures above MFN</strong></summary>
<br />

### Duty basis is the quietest way to be wrong

Most countries charge duty on **CIF**; the United States and Canada assess on
transaction value, which excludes international freight and insurance. Charging
Germany's rate on FOB, or America's on CIF, produces a number that is plausible and
simply incorrect. `dutyBasisFor()` is exported and asserted for exactly that reason.

### Import VAT compounds on the duty

[`vat.ts`](./src/lib/tariff/vat.ts) holds standard rates for **67 destinations**. VAT is
charged on **CIF plus duty**, so it compounds on the duty rather than sitting beside it
— getting that wrong understates it by the VAT rate applied to the duty.

**VAT is normally recoverable.** A VAT-registered business buyer reclaims it as input
tax credit, so we report `landedCostInr` (the competitiveness number) separately from
`cashAtBorderInr` (what the buyer fronts). The agent is forbidden from telling a
manufacturer their price is uncompetitive because of recoverable VAT. Where it
genuinely sticks — Malaysia's SST is a sales tax, not a credit-and-refund VAT —
`recoverable` is false and the narrative says so.

### Trade agreements — eligibility, not rates

[`fta.ts`](./src/lib/tariff/fta.ts) covers **16 agreements**: which one applies, whether
it is actually in force, and how to claim it. It deliberately does **not** return a
preferential rate, because no reachable source has them — WITS TRAINS serves no
preferential lines through its SDMX endpoint, verified against USA↔Mexico under USMCA.

**Status matters.** Only an in-force agreement is claimable; sending a manufacturer to
claim a preference that doesn't yet exist is a real cost to them.

**One exception, and it proves the rule.** Australia is priced from the treaty itself.
TRAINS holds no tariff for it at all, but ECTA's final phase put **100% of Australian
tariff lines at zero** for Indian-origin goods on 1 January 2026 — so the rate is known,
and better known than any MFN average. `DestinationDuty` carries a `rateBasis`
discriminator so nothing downstream describes a treaty rate as an MFN one.

### Measures above MFN

[`surcharge.ts`](./src/lib/tariff/surcharge.ts) is `fta.ts` pointed the other way: it
warns the duty may be **higher**, not lower. Two layers now sit on top of MFN that
TRAINS carries neither of — country-specific reciprocal tariffs, and the EU's CBAM.

For ad valorem measures the corrected figure is **computed conditionally and labelled
as such**. Omitting it is not neutral: on the United States a landed cost built on MFN
alone understates the buyer's duty by 18% of customs value, and the headline number is
the one that gets quoted into a real deal. *"If this measure applies to your line, your
buyer pays X rather than Y"* is not a claim about which rate applies — it's arithmetic
on a stated premise.

Scope is **three-valued**, because the source names categories on both sides: a chapter
can be positively covered, positively exempt, or simply unnamed. Collapsing the middle
into either neighbour is a guess — reading it as in-scope invents a cost, reading it as
exempt hides one.

These rates go stale fast, so every measure carries an `asOf` date and every sentence
says when it was last checked rather than implying it is live.

</details>

<br />

## Trade data

**DGCIS** for what India actually exports — 12,402 tariff lines across seven financial
years, summed over every state and month, reconciling to India's published book
($441.5bn for FY 2025-26).

**UN Comtrade** for world demand, competitors and trends. Queries must request
pre-aggregated rows; without that, flows arrive split across sub-rows and naive
aggregation undercounts by **~500×**.

**World Bank WITS** for tariffs and as a fallback for India's figures — because **India
is absent from UN Comtrade entirely** (no rows as reporter *or* partner; its only
holdings are 1962–74 SITC). That's a data-availability fact, not a subscription tier.

<br />

## Security

- **RLS is the boundary.** Postgres policies guarantee at the database level that one
  manufacturer can never read another's rows.
- **Rate limiting** on public AI endpoints, with `Retry-After` on 429. The anonymous
  Saathi trial is a daily budget rather than a speed limit, and a question is
  **refunded** when the upstream fails — the visitor got nothing and must not lose one.
- **Input validation** — message length caps, and client-supplied `system` roles are
  stripped so the prompt cannot be hijacked via the messages array.
- Internal diagnostics never reach the browser; upstream capacity errors surface as
  `503` with `Retry-After` rather than a bare 500.
- Secrets live only in `.env.local` (gitignored). Never `NEXT_PUBLIC_` a server secret.

<br />

## Deployment

Hosted on **Vercel**, deploying from `main`. Set the environment variables above under
Project → Settings → Environment Variables. CI
([`webpack.yml`](./.github/workflows/webpack.yml)) verifies every push builds cleanly,
using placeholder env values.

<br />

## Contributing

- Match the surrounding code — comment density, naming, idiom.
- **Comments explain *why*, not *what*.** Several in the data layer encode hard-won
  facts (the ×500 undercount, India's absence from Comtrade, that WITS reporter 360 is
  Indonesia and not Australia). Keep them.
- **Never let the product overclaim.** No "live" trade data; always disclose
  provenance; if something is unavailable, say so rather than filling the gap with a
  plausible guess. This applies to marketing copy as much as to Saathi's output.
- **Verify against the real API before asserting data-layer behaviour.** Failures here
  have been silent and large. Always probe with a *positive control* — a query you know
  should return data — before believing a negative result.
- Run `npm run lint`, the relevant `test:` suite, and `npm run build` before opening a PR.

<br />

<div align="center">

---

**ArthaFlow Global** · Pune, India · Building the OS for global trade, one HS code at a time.

[arthaflowglobal.com](https://arthaflowglobal.com)

<sub>© All rights reserved — proprietary.</sub>

</div>
