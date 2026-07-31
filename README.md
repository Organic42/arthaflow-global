<p align="center">
  <strong style="font-size: 32px;">ArthaFlow Global</strong>
</p>

<p align="center">
  <em>Tech-enabled export infrastructure for India's MSME manufacturers.</em>
</p>

<p align="center">
  <img src="https://github.com/Organic42/arthaflow-global/actions/workflows/webpack.yml/badge.svg" alt="Build" />
  <img src="https://img.shields.io/badge/Next.js-16.2-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-149eca" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

---

India has **57M+ registered MSMEs**. Fewer than **0.3% export** — not because their
products aren't good, but because international trade is a wall of HS codes, compliance
documents, buyer discovery and logistics decisions. A traditional export consultant
costs upwards of ₹2 lakh a year and still works manually.

ArthaFlow removes that wall: classify the product correctly, generate every export
document, and tell the manufacturer where in the world their product is actually in
demand.

> **For full business, architecture and data context, read [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).**
> It is the single source of truth, written to brief a new engineer — or an AI
> assistant — from cold.

---

## Quick start

**Prerequisites:** Node.js 22+, npm, and a Supabase project.

```bash
git clone https://github.com/Organic42/arthaflow-global.git
cd arthaflow-global
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

### Environment variables

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

### Database

Apply the migrations in [`supabase/migrations/`](./supabase/migrations) in order, via the
Supabase SQL Editor or CLI. They create 7 tables, 29 RLS policies, 3 functions and 1
trigger.

---

## Scripts

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

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn-style components, Lucide icons |
| Type | Space Grotesk (headings), DM Sans (body), JetBrains Mono (code) |
| Auth / DB / Storage | Supabase — Postgres with Row Level Security |
| LLM | **Groq** — `llama-3.3-70b-versatile` |
| Trade data | UN Comtrade + World Bank WITS |
| Visuals | `cobe` (WebGL globe), `motion` |
| Hosting | Vercel |

> **Next.js 16 is not the Next.js you may know.** It carries breaking changes to APIs,
> conventions and file structure. Consult `node_modules/next/dist/docs/` before writing
> framework code rather than relying on memory — see [`AGENTS.md`](./AGENTS.md).

---

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

**Adding a public page?** Add its path to `publicRoutes` in `src/proxy.ts`, or the auth
proxy will redirect it to `/login`.

---

## Export Saathi

The flagship. Saathi answers the question that comes *before* "help me export" —
**"where does the world actually want my product?"**

It is a tool-calling agent ([`src/lib/saathi/agent.ts`](./src/lib/saathi/agent.ts)) that
selects a tool, queries real trade data, reasons over the numbers, and renders them as
charts inline in the chat.

| Tool | Answers |
|---|---|
| `classifyProduct` | "What's the HS code for my product?" |
| `lookupHs` | "Is this code real, and what does it cover?" |
| `getIndianTariffLines` | "What 8-digit code goes on my shipping bill, and can I legally export it?" |
| `getTopImporters` | "Where can I sell this?" |
| `getTopExporters` | "Who am I competing against?" |
| `getTradeTrend` | "Is demand growing in this market?" |
| `getIndiaExports` | "Who buys this from India?" |

### Design rules

Each of these exists because of a real failure caught in testing. **Do not weaken them.**

1. **No fabrication.** Every country, ranking and figure must come from a successful
   tool result in that conversation. If a tool fails, the model may not name a country
   at all — it says the data is unavailable.
2. **Sources are disclosed.** Mirror statistics and World Bank group-level figures are
   labelled as such, never passed off as exact HS-line data.
3. **HS codes are never recalled from memory** — see below.
4. **Never "live" or "real-time" data.** Trade sources lag by months to years.

---

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
trusting a single file. Its output independently reproduces the official
amendment counts (142 added, 50 omitted, 2 redescribed), which is how we know
the parse is right.

**We never state an effective rate.** DGFT currently limits benefits to 50% of
notified rates, a limitation already extended once. The notified rate and the
limitation are stored and surfaced as separate facts. Collapsing them into one
number produces a figure that looks authoritative and rots silently.

### Duty Drawback — and why it is keyed differently

2,123 rates across 1,014 headings ([`drawback.ts`](./src/lib/hs/drawback.ts)),
from CBIC Notification 77/2023-Customs (N.T.).

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
join. We resolve to the heading and return every item under it: **781 headings
carry a single rate** and answer precisely; the rest return a shortlist with the
mismatch disclosed, and the tool result forbids the model from picking one.

---

## Trade data

**UN Comtrade** for world demand, competitors and trends. Queries must request
pre-aggregated rows; without that, flows arrive split across sub-rows and naive
aggregation undercounts by ~500×.

**World Bank WITS** for India's own export figures — because **India is absent from UN
Comtrade entirely** (no rows as reporter *or* partner; its only holdings are 1962–74
SITC). That is a data-availability fact, not a subscription tier. `getIndiaExports`
falls back `direct → mirror → WITS` and labels which source produced the answer.

---

## Security

- **RLS is the boundary.** Postgres policies guarantee at the database level that one
  manufacturer can never read another's rows.
- **Rate limiting** on public AI endpoints — 15/min per IP on chat, 20/hour per user on
  document generation, with `Retry-After` on 429.
- **Input validation** — message length caps, and client-supplied `system` roles are
  stripped so the prompt cannot be hijacked via the messages array.
- Internal diagnostics never reach the browser, and upstream capacity errors surface as
  `503` with `Retry-After` rather than a bare 500.
- Secrets live only in `.env.local` (gitignored). Never `NEXT_PUBLIC_` a server secret.

---

## Deployment

Hosted on **Vercel**, deploying from `main`. Set the environment variables above under
Project → Settings → Environment Variables.
CI ([`.github/workflows/webpack.yml`](./.github/workflows/webpack.yml)) verifies every
push builds cleanly, using placeholder env values.

---

## Contributing

- Match the surrounding code — comment density, naming, idiom.
- **Comments explain *why*, not *what*.** Several in the data layer encode hard-won
  facts (the ×500 undercount, India's absence from Comtrade). Keep them.
- **Never let the product overclaim.** No "live" trade data; always disclose data
  provenance; if something is unavailable, say so rather than filling the gap with a
  plausible guess. This applies to marketing copy as much as to Saathi's output.
- Verify against the real API before asserting data-layer behaviour — failures here have
  been silent and large.
- Run `npm run lint` and `npm run build` before opening a PR.

---

<p align="center">
  <sub>ArthaFlow Global · Pune, India · © All rights reserved — proprietary.</sub>
</p>
