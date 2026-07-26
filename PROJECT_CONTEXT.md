# ArthaFlow Global — Project Context

**Single source of truth for this codebase and the business behind it.**
Read this end-to-end before making changes or answering questions about ArthaFlow.
If you are an AI assistant picking this project up cold, this file is your briefing.

Last updated: 2026-07-25

---

## 1. What ArthaFlow is

ArthaFlow Global is a **tech-enabled export infrastructure platform for Indian MSME
manufacturers**. It helps small manufacturers sell internationally without hiring an
export consultant.

**The problem.** India has 57M+ MSMEs but **less than 0.3% export**. Not because their
products aren't good — because international trade is a wall of HS codes, compliance
documents, buyer discovery, and logistics decisions. A traditional export consultant
costs upwards of ₹2 lakh/year and still works manually.

**The wedge (what we do first).** Get the HS code right, generate every export
document, and score export-readiness — in minutes, not weeks.

**The vision (where it's going).** The operating system / infrastructure layer for
global trade — "the rails every Indian export runs on."

### The flywheel — this is the core story

```
Export Saathi (intelligence)  →  Documents + HS (execution)  →  Trade data
   "where does the world           "how do I actually              compounds
    want my product?"                ship it?"                        │
        ▲                                                             │
        └─────────────────  Saathi gets sharper  ◀────────────────────┘
```

**Moat framing:** supplier network → buyer network → trade data → AI intelligence.
AI is the *output* of the moat, not the moat itself.

### Company

| | |
|---|---|
| Legal/brand | ArthaFlow Global |
| Base | Pune, Maharashtra, India |
| Website | https://arthaflowglobal.com |
| Contact | info@arthaflowglobal.com |
| Founder & CEO | Sarthak Wage — previously co-founded a 3D game-tech startup as CTO (six-figure revenue, raised multiple rounds) |
| Co-founder & CTO | Sameer Morya — strategy/ops → AI architect, ex-SeekMyCOURSE |

### Business model — an evolution, not a single line

| Phase | Model | Detail |
|---|---|---|
| 1 (now) | **Transaction** | Platform fee 5–7% of shipment value + ₹15k self-export consultation |
| 2 | **Software** | SaaS tiers (below) |
| 3 (scale) | **Infrastructure** | Freight, marine insurance, trade-finance partnerships — highest margin |

**Pricing tiers** (must stay in sync between `pricing/page.tsx` and the Saathi prompt):

| Tier | Price | Includes |
|---|---|---|
| Starter | Free | 3 AI documents/month, HS Code Classifier, Document Vault (5 docs), Export Readiness Score |
| Growth | ₹9,999/mo | Unlimited AI documents, buyer inquiry access, WhatsApp notifications, priority support |
| Managed | ₹29,999/mo | Dedicated export manager, logistics orchestration, compliance handholding, quarterly reviews |

### Fundraise

Raising **₹1 Cr seed (~15% equity)** for 18–22 months runway. Targets: 100+ paying
manufacturers, ₹15 Cr+ GMV, positive unit economics, Series-A ready. Founders split
50-50. Approached so far: Artha Venture Fund, 100+ Accelerator, Utpal Doshi, Titan Capital.

### Narrative discipline (important when writing any copy)

1. **Lead with the wedge, not the vision.** At seed, prove the sharp thing first; the
   "OS for global trade" line belongs at the *end* so the investor extrapolates to it.
2. **Never say "live" or "real-time" trade data.** Sources lag by months to years.
   Say "the latest available trade data." Overclaiming here is a diligence trap.
3. **Be honest about software-vs-services margins.**
4. **TAM bottoms-up** (serviceable revenue), never GMV or "$450B of trade."
5. What actually converts investors is **monetised pull** — paying manufacturers and
   repeat shipments — not vision slides.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.6** (App Router) — ⚠️ see §9 |
| UI | React 19.2.4, Tailwind CSS v4, shadcn-style components |
| Auth / DB / Storage | Supabase (Postgres + RLS) |
| LLM | Groq SDK — `llama-3.3-70b-versatile` (Saathi agent) |
| Trade data | UN Comtrade + World Bank WITS |
| Visuals | `cobe` (WebGL globe), `motion`, `lucide-react`, `canvas-confetti` |
| Analytics | Vercel Analytics |
| Hosting | Vercel |

**Brand tokens** (`src/app/globals.css`): navy `#0B1D3A`, artha-gold `#D4A843`,
royal-blue `#163A6E`, action-blue `#2563EB`, soft-gold `#F5E6B8`.
Use the Tailwind classes (`bg-artha-gold`, `text-navy`), not raw hex.

---

## 3. Repository layout

> ⚠️ **`arthaflow/` is its own git repo nested inside the parent folder** — not a
> submodule (there is no `.gitmodules`). Run git commands from inside `arthaflow/`.
> Remote: `origin` → `github.com/Organic42/arthaflow-global.git`, branch `main`.

```
src/
├── app/
│   ├── (public)/          page.tsx (home), pricing, blog, privacy, terms
│   ├── (auth)/            login, onboarding
│   ├── (dashboard)/       dashboard, products, documents, documents/generate,
│   │                      shipments, inquiries, settings, help, states, mobile
│   ├── (admin)/           admin
│   ├── api/
│   │   ├── chat/          ← Export Saathi endpoint (the flagship)
│   │   ├── generate-document/
│   │   ├── tools/trade/   ← auth-gated trade-tool test harness
│   │   └── auth/callback/
│   ├── layout.tsx         metadata, OpenGraph, Analytics
│   ├── error.tsx, robots.ts, sitemap.ts, opengraph-image.png
│   └── globals.css        design tokens
├── components/
│   ├── arthaflow/         chat-bot, trade-chart, globe, navs, footer, sidebar, …
│   └── ui/                shadcn primitives
├── lib/
│   ├── saathi/agent.ts    ← the tool-calling agent
│   ├── comtrade/          client.ts, tools.ts, countries.ts
│   ├── wits/client.ts     ← World Bank fallback for India data
│   ├── supabase/          client.ts (browser), server.ts (SSR)
│   ├── rate-limit.ts      in-memory sliding window
│   └── utils.ts
├── proxy.ts               auth middleware — holds `publicRoutes`
└── supabase/migrations/   001–005
```

**Adding a public page?** You must add its path to `publicRoutes` in `src/proxy.ts`
or the proxy will redirect it to `/login`. This has bitten us before (privacy/terms).

---

## 4. Database (Supabase Postgres)

7 tables, 29 RLS policies, 3 functions, 1 trigger. RLS is the security boundary —
it guarantees at the *database* level that manufacturer A can never read
manufacturer B's rows. This is a genuine asset in technical diligence.

| Table | Purpose |
|---|---|
| `profiles` | Business details — `business_name`, GST, IEC, turnover, export experience, `role` (manufacturer/admin), onboarding state |
| `products` | Catalogue — `name`, `hs_code`, capacity, MOQ, certifications, status |
| `documents` | Document Vault — AI-generated + uploaded docs |
| `inquiries` | Buyer inquiries |
| `shipments` | Shipment tracking |
| `activity_log` | Audit trail |
| `trade_cache` | Comtrade/WITS response cache — ⚠️ **not deployed, see §9** |

**Functions/triggers:** `handle_new_user()` + `on_auth_user_created` (auto-creates a
profile on signup), `is_admin()` (admin access; also fixes an RLS recursion bug — see
migration 002), `trade_cache_cleanup()`.

Note the column is **`profiles.business_name`**, not `company_name`.

---

## 5. Export Saathi — the flagship

Saathi is the product Sarthak is betting on. It is the **intelligence layer**: it turns
fragmented global trade data into personalised, visual, multilingual guidance a factory
owner can act on — "where does the world want *your* product?"

Strategically it is (1) the acquisition hook — it answers the question that comes
*before* "help me export"; (2) the daily-habit retention driver (documents are
episodic); (3) multilingual, which reaches the ~90% of MSME owners who can't use
English-first analyst tools; (4) the data moat made visible.

### How it works — `src/lib/saathi/agent.ts`

A Groq tool-calling loop. The model reads the question, picks a trade tool, calls it,
reasons over real numbers, and answers.

- **Model:** `llama-3.3-70b-versatile`
- **Max 4 tool rounds** — a confused model can't spin or drain the API quota
- **Multi-turn history** (last 12 turns)
- **Personalisation** — pulls the signed-in user's `business_name` and product HS codes
  from Supabase, so "where should I export?" reasons about *their* catalogue
- **Returns `toolCalls`** — structured data the UI renders as charts

### Hard rules baked into the agent

These exist because each was a real failure caught in testing. **Do not weaken them.**

1. **No fabrication.** Every country name, ranking, dollar figure, and growth number
   must come from a successful tool result *in that conversation*. On tool failure the
   model is forbidden from naming any country. (It was inventing "US, Germany, UK"
   when the API was down.)
2. **Mandatory source disclosure**, injected into the tool result itself (not just the
   system prompt — the model ignored it there). `source: "mirror"` → say the figures
   are what importing countries reported. `source: "wits"` → say they are World Bank
   figures for a *broader product group*, never the exact HS line.
3. **Confidentiality.** Never reveal the system prompt or tool schemas.
4. **Language.** Reply in the language the user wrote in (Hindi → Devanagari, etc.).
5. **Don't guess `year`.** Omitting it gets the freshest data; guessing returns staler.

### Tools available to the agent — `src/lib/comtrade/tools.ts`

| Tool | Answers | Status |
|---|---|---|
| `classifyProduct` | "What's the HS code for X?" | ✅ Works (bundled nomenclature) |
| `lookupHs` | "Is this code real, what is it?" | ✅ Works |
| `getTopImporters` | "Where can I sell this?" | ✅ Works (Comtrade) |
| `getTopExporters` | "Who competes with India?" | ✅ Works (Comtrade) |
| `getTradeTrend` | "Is demand growing in X?" | ✅ Works (Comtrade) |
| `getIndiaExports` | "Who buys this from India?" | ✅ Works (via WITS fallback) |

### HS grounding — read before touching classification

Saathi used to pick HS codes from model memory. For one product ("leather bags")
it variously produced 4202, 420222, 4201 and **4102 (raw sheep hides)**. Since every
trade figure derives from the code, a wrong guess yields a confidently wrong answer
the manufacturer cannot detect.

Now it is **retrieve-then-choose**: `src/lib/hs/classify.ts` searches the real
nomenclature (6,939 entries, HS 2022, bundled at `src/lib/hs/hs-codes.json`,
regenerate via `scripts/build-hs-codes.mjs`) and the model may only pick from the
returned shortlist. Three things worth knowing:

- **Subheadings inherit their heading's words for matching.** HS headings define the
  scope their subheadings subdivide, so 830241 legitimately "means" 8302's text too.
  Without this, "brass door **handles**" misses 8302's children entirely — only the
  4-digit heading mentions doors.
- **Chapter 99 is excluded from search results.** It is "commodities not specified
  according to kind" — a real code (so `lookupHs` still resolves it) but never a
  correct answer for a product, and querying trade data with it returns vast
  unclassified totals that look like real product figures.
- **`isValidHsCode` is deliberately strict** (exact match, no walking up to the
  parent). Comtrade silently ignores a `cmdCode` it doesn't recognise and returns
  TOTAL trade instead — so a bogus code produces a plausible, product-specific-looking
  answer that is actually the country's entire trade. All four trade tools guard on it.

**The alias layer** (`src/lib/hs/aliases.ts`) bridges two gaps keyword search alone
cannot:

- **Language.** HS text is English only, and the tokeniser used to strip everything
  non-ASCII — so Devanagari input produced *zero* tokens and matched nothing, failing
  exactly the users the multilingual promise targets. Indic scripts now survive
  tokenisation and the alias table translates them: "चमड़े के बैग" → 420221.
- **Vocabulary.** A manufacturer says "brass"; the nomenclature says "base metal".
  Single-word aliases carry `ALIAS_WEIGHT` (0.55), below the user's literal words.
- **Function vs material.** HS classifies many goods by what they *do*, not what they
  are made of, and a material word drags the search the wrong way. `PHRASE_ALIASES`
  matches adjacent token pairs ("door handle", "auto part") at `PHRASE_WEIGHT` (0.85),
  since a two-word product name is stronger evidence than either word alone.

Add entries when a lookup visibly fails — that is the signal. Expansions are weighted
below literal matches precisely so the table broadens recall without hijacking queries.

**Known limitation:** for a query like "brass door handles" the raw-copper codes still
outrank 8302 (builders' fittings) on lexical grounds, because "brass" appears literally
in the chapter-74 descriptions. The correct family does reach the shortlist (rank ~7 of
8), so the model can still choose it — this is why `classifyProduct` returns a
shortlist rather than one answer. Closing it properly needs embeddings.

**Phase 2 remainder — NOT built.** pgvector semantic search is blocked twice over: the
migration cannot be applied (see §9.2, same service-role gap as `trade_cache`), and no
embedding provider is configured (Groq serves no embedding endpoint, so it needs a new
key). When both are resolved, embeddings on the same data would subsume most of the
alias table.

`getTradeTrend`: leave `partnerIso` **empty** for market-demand questions — it then
trends the country's total trade with the world, which has far better coverage than
any single bilateral pair.

---

## 6. Trade data — read this before touching data code

### UN Comtrade

- Free tier: 500 requests/day, 100K records/call. Key: `COMTRADE_API_KEY`.
- **Always send `partner2Code=0&motCode=0&customsCode=C00`.** Without them Comtrade
  splits each flow across dozens of sub-rows (second-partner × transport × customs) and
  naive per-reporter aggregation **undercounts by ~500×** — Germany's $4B of HS 4202
  imports read as $8M. This is handled in `src/lib/comtrade/client.ts`; don't remove it.
- `partnerCode=0` means the **World aggregate**, not "all partners." To get a partner
  breakdown you must expand the partner dimension.
- Default year is **current year − 2**. The latest year is usually unpublished.

### ⚠️ India is absent from UN Comtrade

This is the single most important data fact in the project. Verified exhaustively:

- Comtrade's availability endpoint returns **0 rows** for India (M49 `356`) for annual
  and monthly HS. India's only holdings are **1962–1974 SITC Rev.1**.
- For 2023, 167 reporters have annual HS data — **India is not among them**.
- India doesn't even appear as a *partner* in other countries' filings (the USA's
  157-partner import breakdown has no India row), so **mirror statistics don't rescue it**.
- Both API keys behave identically → **not** a subscription-tier issue.
- Context: World Bank notes Comtrade coverage fell from 177 countries (2017) to 146 (2024).

**Do not buy a Comtrade tier upgrade to fix this — it will not help.** Paid tiers add
bulk/async download and higher caps: volume and speed, not coverage.

### World Bank WITS — the India fallback

`src/lib/wits/client.ts`. Endpoint:

```
https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade
  /reporter/ind/year/{YEAR}/partner/all/product/{GROUP}/indicator/XPRT-TRD-VL
```

- Values are in **thousands of USD**.
- Latest complete year ≈ **current year − 3** (2023 available; 2024 not).
- Products are **HS chapter groups**, not 6-digit lines — 16 of them
  (`41-43_HidesSkin`, `50-63_TextCloth`, `84-85_MachElec`, …). The client maps an HS
  code's chapter to its group. Ranges are continuous, covering chapters 01–99.
- The partner list mixes real countries with World Bank **region aggregates**
  (`ECS`, `NAC`, `EAS`) — filtered out by intersecting with `comtrade/countries.ts`.
- SDMX XML, parsed by regex (flat `<Series PARTNER><Obs OBS_VALUE/></Series>`) — no deps.
- Cache key is per **group**, so re-stamp the caller's `hsCode` on a cache hit
  (HS 4202 and 4201 share a group).

**Sanity check** — India 2023 via WITS: textiles $34.2B, gems & jewellery $39.6B,
machinery $61.6B, chemicals $57.8B. These match real-world figures.

### `getIndiaExports` fallback chain

```
Comtrade direct  →  Comtrade mirror  →  WITS
```

It falls through on **any** failure, not just `NO_DATA` — a Comtrade rate-limit must
not deny data WITS can serve. (That exact bug was caught in QA.)

---

## 7. Security model

- **RLS** is the real boundary; app code is not the last line of defence.
- **Rate limiting** (`src/lib/rate-limit.ts`) — in-memory sliding window, per-instance,
  auto-pruned, capped at 5000 keys. `/api/chat` 15/min per IP; `/api/generate-document`
  20/hour per user. Move to Upstash Redis if you scale to multiple regions.
- `/api/chat` caps messages at **1000 chars**; client-supplied `system` roles are
  **stripped** (no prompt injection via role).
- `/api/tools/trade` is **auth-gated** (401 anonymous).
- Failed tool results are **not** returned to the browser — they carry internal
  diagnostics (env-var names, upstream rate-limit notices).
- Upstream 429/503 → we return **503 + `Retry-After`**, never a bare 500.
- Secrets live only in `.env.local` (gitignored inside `arthaflow/`). Never `NEXT_PUBLIC_*`
  a server secret.
- No `dangerouslySetInnerHTML` anywhere — keep it that way.

---

## 8. Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (uses --webpack)
npm start
ANALYZE=true npm run build   # bundle analysis
```

Required `.env.local` keys (**names only — never commit values**):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GROQ_API_KEY
COMTRADE_API_KEY
SUPABASE_SERVICE_ROLE_KEY   # optional — enables trade-data caching (§9.2).
                            # Server-only. NEVER prefix with NEXT_PUBLIC_.
```

Lint: `npx eslint src`. Typecheck: `node node_modules/typescript/bin/tsc --noEmit`.

---

## 9. Known issues & gotchas

**⚠️ 1. Next.js 16 is not the Next.js you know.** See `AGENTS.md`. Breaking changes to
APIs, conventions, and file structure. **Read `node_modules/next/dist/docs/` before
writing framework code** rather than relying on training data.

**⚠️ 2. Caching is wired but not yet switched on.** Two prerequisites, both manual:

- **(a) Apply migration `005`.** It has never been run against the live database — the
  REST endpoint returns 404 for `trade_cache`. Paste `supabase/migrations/005_trade_cache.sql`
  into the Supabase SQL Editor.
- **(b) Set `SUPABASE_SERVICE_ROLE_KEY`** (Supabase → Settings → API → `service_role`)
  in `.env.local` and in Vercel's env vars. `trade_cache` is deny-all under RLS, so only
  a service-role client can reach it — see `src/lib/supabase/admin.ts`. This is
  deliberate: the anon key ships to the browser, and a publicly writable cache would let
  anyone seed false trade figures that Saathi would repeat as fact.

Until both are done, `createAdminClient()` returns `null`, caching is skipped, and every
lookup hits the upstream API — correct behaviour, but it burns Comtrade's 500/day quota
and adds latency. `next: { revalidate }` on the fetches still gives some protection in
production. **Never prefix the service-role key with `NEXT_PUBLIC_`.**

**⚠️ 3. Groq free tier = 100,000 tokens/day, org-wide.** It is genuinely easy to
exhaust (a QA session did). Users then see "Saathi is at capacity." Upgrade to Dev Tier
before any investor demo or launch.

**4. Groq rejects malformed tool arguments** with a 400 that kills the whole request
(the model intermittently emits `"limit": "5"` as a string). `completeResiliently()`
retries with a type-correction nudge, then drops tools rather than failing.

**⚠️ 5. Hindi replies degenerate.** Asked in Hindi, Saathi understands correctly and
calls the right tools — but when writing Devanagari **after a long English tool
context** it loops: one run produced 4,747 characters built from 10 distinct symbols
and zero Devanagari. The model is not the limit — called directly it writes Devanagari
fine — so this is a decoding failure, not a capability one. `frequency_penalty: 0.3`
is in place as the standard mitigation but is **UNVERIFIED** (quota ran out). If it
proves insufficient, the fix is a different model for non-Latin output. Multilingual
is a flagship claim, so treat this as blocking for that promise.

**6. The WebGL globe blocks headless screenshots.** Use Chrome DevTools Protocol with
scroll-through (to fire `whileInView` reveals) rather than `--screenshot`.

**7. Copy discrepancy — reconcile before launch.** The homepage says *"Trusted by 50+
manufacturers across Maharashtra"* while investor materials say **5 pilot
manufacturers**. Pick one truthful number.

**8. Site copy still reflects v1 positioning** ("AI-Powered Export Infrastructure",
feature-led) while the investor narrative has moved to the wedge-first framing in §1.

---

## 10. Status & roadmap

**Shipped:** auth + onboarding, dashboard, product catalogue, Document Vault, AI
document generator, HS classifier, Export Saathi agent with real trade data + charts,
public marketing site, legal pages, SEO (robots/sitemap/OG), rate limiting.

**Verified working end-to-end (good demo questions):**
- "Where can I export leather handbags?" → US $12.1B, Japan $6.3B, China $5.6B …
- "Who competes with India in cotton textiles?"
- "Is demand for leather handbags growing in Germany?" → +38.7% 2020→2024
- "Which countries buy the most leather goods from India?" → $2.9B, US 23.9% (WITS)

**Next up:**
1. Apply migration 005 + service-role key → make caching real (see §9.2)
2. Upgrade Groq tier (§9.3)
3. Shipment documents are a static placeholder in `shipments/page.tsx`
4. Persist Saathi conversations — retention + feeds the data moat
5. Deepen multilingual coverage (Hindi + regional) — it's a core differentiator
6. Reconcile site copy with the v2 narrative and the pilot count

---

## 11. Conventions for contributors (human or AI)

- **Match the surrounding code** — comment density, naming, idiom.
- **Comments explain *why*, not *what*.** The data-layer comments encode hard-won facts
  (the ×500 undercount, India's absence); keep them.
- **Never let the product overclaim.** No "live/real-time" trade data. Always disclose
  mirror/WITS provenance. If data is unavailable, say so — never fill the gap with a
  plausible guess. This applies to marketing copy as much as to Saathi's output.
- **Verify before asserting.** Data-layer bugs here have been silent and large; test
  against the real API rather than trusting a shape.
- **Don't commit business documents** (pitch decks, data-room HTML) with code changes.
