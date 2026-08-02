<div align="center">

<img src="public/logo.png" width="88" alt="ArthaFlow Global" />

# ArthaFlow Global

### The operating system for global trade — starting with India's 57M unexported MSMEs.

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&size=18&duration=2600&pause=900&color=D4A843&center=true&vCenter=true&width=650&lines=Classify+the+product.+Generate+the+paperwork.;Find+where+in+the+world+it+sells.;No+HS+code+guesswork.+No+fabricated+data.;Built+by+founders%2C+not+a+feature+factory." alt="Typing SVG" />

<br />

[![Build](https://github.com/Organic42/arthaflow-global/actions/workflows/webpack.yml/badge.svg)](https://github.com/Organic42/arthaflow-global/actions/workflows/webpack.yml)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

**[arthaflowglobal.com](https://arthaflowglobal.com)** · **[Read the full context →](./PROJECT_CONTEXT.md)**

</div>

<br />

<div align="center">
<img src="public/port-dusk-hero.webp" width="100%" alt="Container port at dusk" />
</div>

<br />

## The wall

India has **57M+ registered MSMEs.** Fewer than **0.3% export.**

Not because the products aren't good enough for the world — because international
trade is a wall of HS codes, compliance paperwork, buyer discovery and logistics
decisions that a small manufacturer has no way to climb alone. A traditional export
consultant costs upwards of **₹2 lakh a year** and still does it by hand.

**ArthaFlow removes the wall.** Classify the product correctly, generate every export
document, tell the manufacturer where in the world their product is actually in demand
— and get out of the way.

> 🧭 **New here?** [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) is the single source of
> truth for business, architecture and data context — written to brief a new engineer
> (or an AI assistant) from cold.

<br />

## What's live

<table>
<tr>
<td width="33%" valign="top">

### 🧠 Export Saathi
A tool-calling trade-intelligence agent. Ask it "who buys leather bags in Europe" and
it queries **real** UN Comtrade / WITS data, reasons over the numbers, and renders the
answer as a chart — inline, in chat.

</td>
<td width="33%" valign="top">

### 🏷️ HS Classification
Retrieve-then-choose against the real HS 2022 nomenclature — **6,939 vendored
entries.** The model picks from a shortlist; it can never invent a code. Indic-script
aliases included.

</td>
<td width="33%" valign="top">

### 📄 Document Generation
Auto-drafts the export paperwork a shipment actually needs, grounded in the
classified product and destination — no blank templates, no manual re-keying.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### 💰 Landed Cost Engine
FOB → duty → VAT → RoDTEP → Drawback, both directions: what the buyer pays, what the
exporter nets. Duty basis (CIF vs. transaction value) handled per destination —
getting this wrong moves the number by thousands of rupees.

</td>
<td width="33%" valign="top">

### 🌍 44-Country Tariff Coverage
Real MFN import duty + VAT/GST rates, sourced from UNCTAD TRAINS — every code
individually verified against a live query, not scraped and trusted.

</td>
<td width="33%" valign="top">

### 🔍 20 pilot manufacturers
Live on the platform today, validating Saathi and the document generator ahead of
a **late-August 2026** public launch.

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
| Framework | **Next.js 16** (App Router) · React 19 · TypeScript |
| UI | Tailwind CSS 4 · shadcn-style components · Lucide icons |
| Type | Space Grotesk (headings) · DM Sans (body) · JetBrains Mono (code) |
| Auth / DB / Storage | Supabase — Postgres with Row Level Security |
| LLM | **Groq** — `llama-3.3-70b-versatile` |
| Trade data | UN Comtrade + World Bank WITS |
| Visuals | `cobe` (WebGL globe) · `motion` |
| Hosting | Vercel |

</div>

> ⚠️ **Next.js 16 is not the Next.js you may know.** It carries breaking changes to
> APIs, conventions and file structure. Consult `node_modules/next/dist/docs/` before
> writing framework code rather than relying on memory — see [`AGENTS.md`](./AGENTS.md).

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
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (browser-safe) |
| `GROQ_API_KEY` | yes | LLM inference — Saathi and document generation |
| `COMTRADE_API_KEY` | yes | UN Comtrade trade data ([register free](https://comtradeplus.un.org)) |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Enables trade-data caching. **Server-only — never prefix with `NEXT_PUBLIC_`** |

Without `GROQ_API_KEY` the chat and document endpoints return 500. Without
`COMTRADE_API_KEY` the trade tools degrade gracefully and report data as unavailable —
they never fabricate figures.

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
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test:hs` | HS retrieval regression check — run after touching `src/lib/hs/` |
| `ANALYZE=true npm run build` | Bundle composition report |
| `node scripts/build-hs-codes.mjs` | Regenerate the bundled HS nomenclature (6-digit, UN Comtrade) |
| `python scripts/build-itchs.py` | Regenerate India's 8-digit ITC-HS schedule (DGFT). Needs `pdfplumber` |
| `python scripts/build-rodtep.py` | Regenerate RoDTEP rebate rates (DGFT Appendix 4R). Needs `pdfplumber` |
| `python scripts/build-drawback.py` | Regenerate Duty Drawback rates (CBIC 77/2023-Cus N.T.). Needs `pdfplumber` |

</details>

<br />

## Architecture

```
src/
├── app/
│   ├── (public)/          Homepage, pricing, blog, privacy, terms
│   ├── (auth)/            Login, onboarding
│   ├── (dashboard)/       Dashboard, products, documents, shipments, inquiries…
│   ├── (admin)/           Internal ops
│   └── api/
│       ├── chat/              Export Saathi — the trade-intelligence agent
│       ├── generate-document/ AI export document generation
│       └── tools/trade/       Auth-gated trade-tool harness
├── components/
│   ├── arthaflow/         Product components (chat-bot, trade-chart, globe, navs…)
│   └── ui/                Primitives
├── lib/
│   ├── saathi/agent.ts    Tool-calling agent loop
│   ├── hs/                HS classification — nomenclature, search, aliases
│   ├── comtrade/          UN Comtrade client + trade tools
│   ├── wits/              World Bank fallback for India data
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

It's a tool-calling agent ([`src/lib/saathi/agent.ts`](./src/lib/saathi/agent.ts)) that
selects a tool, queries real trade data, reasons over the numbers, and renders them as
charts inline in the chat.

| Tool | Answers |
|---|---|
| `classifyProduct` | "What's the HS code for my product?" |
| `lookupHs` | "Is this code real, and what does it cover?" |
| `getIndianTariffLines` | "What 8-digit code goes on my shipping bill, and can I legally export it?" |
| `getImportDuty` | "What duty will my buyer pay to land this in Germany?" |
| `calculateLandedCost` | "What does this shipment cost my buyer, and what do I net?" |
| `getTopImporters` | "Where can I sell this?" |
| `getTopExporters` | "Who am I competing against?" |
| `getTradeTrend` | "Is demand growing in this market?" |
| `getIndiaExports` | "Who buys this from India?" |

<details>
<summary><strong>Design rules — do not weaken these</strong></summary>
<br />

Each of these exists because of a real failure caught in testing.

1. **No fabrication.** Every country, ranking and figure must come from a successful
   tool result in that conversation. If a tool fails, the model may not name a country
   at all — it says the data is unavailable.
2. **Sources are disclosed.** Mirror statistics and World Bank group-level figures are
   labelled as such, never passed off as exact HS-line data.
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
guaranteed valid there), hand the model a shortlist, and let it choose — it cannot
invent a code. The chosen code is always shown to the user for correction.

An alias layer ([`src/lib/hs/aliases.ts`](./src/lib/hs/aliases.ts)) bridges how
manufacturers speak and how the nomenclature is written, including Indic scripts — so
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
overstatement by orders of magnitude. Classification therefore still resolves to 6
digits ([`classify.ts`](./src/lib/hs/classify.ts)) and the tariff line is a separate
lookup ([`itchs.ts`](./src/lib/hs/itchs.ts)).

### RoDTEP rebate rates

10,610 rates from DGFT's Appendix 4R ([`rodtep.ts`](./src/lib/hs/rodtep.ts)) — a
percentage of FOB value, capped per unit, covering ~85% of export lines. This is
money back on a shipment, so it is the number an exporter asks for first.

The schedule is a base notification plus a chain of amendments, and
[`build-rodtep.py`](./scripts/build-rodtep.py) replays that chain rather than
trusting a single file. Its output independently reproduces the official amendment
counts (142 added, 50 omitted, 2 redescribed), which is how we know the parse is
right.

**We never state an effective rate.** DGFT currently limits benefits to 50% of
notified rates, a limitation already extended once. The notified rate and the
limitation are stored and surfaced as separate facts. Collapsing them into one number
produces a figure that looks authoritative and rots silently.

### Duty Drawback — and why it's keyed differently

2,123 rates across 1,014 headings ([`drawback.ts`](./src/lib/hs/drawback.ts)), from
CBIC Notification 77/2023-Customs (N.T.).

RoDTEP is published against real 8-digit ITC-HS tariff items and joins cleanly.
**The Drawback Schedule does not.** It carries its own numbering that follows the
Customs Tariff only to 4 digits, then subdivides on its own terms:

| Drawback code level | Valid as ITC-HS |
|---|---|
| 8-digit | **0%** (0 of 340) |
| 6-digit | 6% (51 of 925) |
| 4-digit heading | **100%** (419 of 419) |

So drawback item `42020101` is not tariff line `42022110`, though both describe
leather bags. Attaching a drawback rate to an 8-digit ITC-HS code is a fabricated
join. We resolve to the heading and return every item under it: **781 headings carry
a single rate** and answer precisely; the rest return a shortlist with the mismatch
disclosed, and the tool result forbids the model from picking one.

</details>

<br />

## Destination import duty & landed cost

**What the buyer pays to land the goods** ([`src/lib/tariff/`](./src/lib/tariff)) —
the number that decides whether an export is worth making. Germany charges 3% on
leather handbags; Türkiye charges 33%.

We deliberately do **not** build India's own BCD and IGST. That's what an *importer*
pays bringing goods into India, and our user is an exporter — that's what the panel
competitors ship because they also serve importers.

Source is UNCTAD TRAINS via WITS. 44 destinations, verified individually against a
live query — countries TRAINS had no data for are omitted rather than guessed, so an
unsupported destination fails loudly instead of silently returning nothing.

**Rates are MFN** — before any trade agreement. India has agreements with the UAE,
Japan, Korea, ASEAN and others under which the real rate may be zero, so the tool
result labels it MFN, says a preference may apply, and forbids presenting it as
landed cost.

<details>
<summary><strong>Landed cost, import VAT, and trade agreements</strong></summary>
<br />

### Landed cost, both directions

[`landed-cost.ts`](./src/lib/tariff/landed-cost.ts) composes everything above to
answer the two questions a manufacturer actually has:

- **What will my buyer pay to land this?** FOB + freight + insurance + duty
- **What do I net?** FOB + RoDTEP + Drawback

**Duty basis matters and is easy to get silently wrong.** Most countries charge duty
on CIF; the United States and Canada assess on transaction value, which excludes
international freight and insurance. On a ₹5L shipment with ₹50k freight, using the
wrong basis moves the US duty by ₹4,050. `dutyBasisFor()` is exported and asserted in
the test suite for exactly that reason.

Every caveat that materially moves the number travels **with** the number rather than
being buried: MFN vs preferential, the duty basis, an unapplied RoDTEP cap, and an
ambiguous drawback heading. It's an estimate, never a quote, and the tool result says
so.

### Import VAT — and why it's reported separately

[`vat.ts`](./src/lib/tariff/vat.ts) holds standard VAT/GST rates for 40 destinations.
Two details decide whether this helps or misleads:

**VAT is charged on CIF plus duty**, so it compounds on the duty rather than sitting
beside it. On our ₹5L shipment to Germany the duty is ₹16,500 and the VAT is
**₹1,07,635 — 6.5× the duty.** Omitting it was the largest gap in the estimate.

**VAT is normally recoverable.** A VAT-registered business buyer reclaims import VAT
as input tax credit, so for the B2B buyers our manufacturers sell to it's a
cash-flow cost, not a cost of goods. We therefore report `landedCostInr` (the
competitiveness number) separately from `cashAtBorderInr` (what the buyer fronts),
and the agent is forbidden from telling a manufacturer their price is uncompetitive
because of recoverable VAT. Where it genuinely sticks — Malaysia's SST is a sales
tax, not a credit-and-refund VAT — `recoverable` is false and the narrative says so.

Countries with no import VAT (United States, Hong Kong, Qatar, Kuwait) return null
**with a reason**, which is a different answer from a country we simply hold no rate
for.

### Trade agreements — eligibility, not rates

[`fta.ts`](./src/lib/tariff/fta.ts) says which agreement covers a destination,
whether it's actually in force, and how to claim it. It deliberately does **not**
return a preferential rate.

**Because no reachable source has them.** WITS TRAINS serves no preferential lines
through its SDMX endpoint — verified against USA↔Mexico under USMCA, which would
certainly carry data if the endpoint served preferential rates at all, on both
`reported` and `aveestimated` datatypes. India's own CEPA schedules are published as
annexes; the commerce.gov.in links are dead and the UAE ministry copy is blocked.
Guessing a rate here would be the worst thing this codebase could ship.

The eligibility signal still changes the advice, which is the point:

> The UAE charges **5% MFN**. India–UAE CEPA has been in force since May 2022, so
> your buyer likely pays less — we don't hold the preferential rate, confirm it with
> their broker. A Certificate of Origin from DGFT's portal is required; without it
> the MFN rate applies.

**Status matters.** Only an in-force agreement is claimable; signed and announced
ones are marked separately, because sending a manufacturer to claim a preference
that doesn't yet exist is a real cost to them. And where MFN is already 0%
(Singapore), the wording says a preference changes nothing rather than claiming the
duty is overstated.

</details>

<br />

## Trade data

**UN Comtrade** for world demand, competitors and trends. Queries must request
pre-aggregated rows; without that, flows arrive split across sub-rows and naive
aggregation undercounts by ~500×.

**World Bank WITS** for India's own export figures — because **India is absent from
UN Comtrade entirely** (no rows as reporter *or* partner; its only holdings are
1962–74 SITC). That's a data-availability fact, not a subscription tier.
`getIndiaExports` falls back `direct → mirror → WITS` and labels which source
produced the answer.

<br />

## Security

- **RLS is the boundary.** Postgres policies guarantee at the database level that one
  manufacturer can never read another's rows.
- **Rate limiting** on public AI endpoints — 15/min per IP on chat, 20/hour per user
  on document generation, with `Retry-After` on 429.
- **Input validation** — message length caps, and client-supplied `system` roles are
  stripped so the prompt cannot be hijacked via the messages array.
- Internal diagnostics never reach the browser, and upstream capacity errors surface
  as `503` with `Retry-After` rather than a bare 500.
- Secrets live only in `.env.local` (gitignored). Never `NEXT_PUBLIC_` a server
  secret.

<br />

## Deployment

Hosted on **Vercel**, deploying from `main`. Set the environment variables above under
Project → Settings → Environment Variables. CI
([`.github/workflows/webpack.yml`](./.github/workflows/webpack.yml)) verifies every
push builds cleanly, using placeholder env values.

<br />

## Contributing

- Match the surrounding code — comment density, naming, idiom.
- **Comments explain *why*, not *what*.** Several in the data layer encode hard-won
  facts (the ×500 undercount, India's absence from Comtrade). Keep them.
- **Never let the product overclaim.** No "live" trade data; always disclose data
  provenance; if something is unavailable, say so rather than filling the gap with a
  plausible guess. This applies to marketing copy as much as to Saathi's output.
- Verify against the real API before asserting data-layer behaviour — failures here
  have been silent and large.
- Run `npm run lint` and `npm run build` before opening a PR.

<br />

<div align="center">

---

**ArthaFlow Global** · Pune, India · Building the OS for global trade, one HS code at a time.

info@arthaflowglobal.com · [arthaflowglobal.com](https://arthaflowglobal.com)

<sub>© All rights reserved — proprietary.</sub>

</div>
