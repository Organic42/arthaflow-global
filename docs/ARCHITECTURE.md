# ArthaFlow Global — Architecture

**AI is used exactly where the problem is ambiguous — and never where the problem has
a right answer.**

That sentence explains every decision below. This document describes what the system
is, how a manufacturer's question moves through it, and which parts of it a language
model is allowed to touch.

For setup, data provenance and the verification tables, see the [README](../README.md).

---

## 1. The organising idea

**One classification unlocks the entire system.** The 8-digit ITC-HS code is the join
key across every dataset we hold. Once a product has a code, everything else — duty,
VAT, trade-agreement eligibility, RoDTEP, drawback, GST, export policy, market demand —
is a keyed lookup rather than a judgement call.

So the only genuinely hard problem in the product is getting the code right, and that
is the one place a model is involved in an answer.

---

## 2. The stack

Data flows upward. Note where the agent sits: **near the top, not at the centre.**

```
┌──────────────────────────────────────────────────────────────┐
│ ⑥ CLIENT                                                     │
│   Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 │
│   Manufacturer dashboard · documents · streaming chat        │
├──────────────────────────────────────────────────────────────┤
│ ⑤ API                                                        │
│   /api/chat (NDJSON progress stream) · /api/tariff/*         │
│   /api/hsn-search · /api/generate-document                   │
│   Auth-gated · per-user rate limiting                        │
├──────────────────────────────────────────────────────────────┤
│ ④ AI AGENT — Export Saathi                                   │
│   10 registered tools · max 3 tool rounds                    │
│   Language enforcement · model-agnostic client               │
├──────────────────────────────────────────────────────────────┤
│ ③ DOMAIN ENGINES — pure TypeScript, no AI, no network        │
│   classification · landed cost · FTA · incentives · market   │
│   247 automated checks, mutation-verified                    │
├──────────────────────────────────────────────────────────────┤
│ ② DATA PIPELINE                                              │
│   build-time → 7 scripts vendor official data to versioned   │
│                JSON, committed to the repo                   │
│   runtime    → Comtrade / WITS, cached in Supabase, 30d TTL  │
├──────────────────────────────────────────────────────────────┤
│ ① OFFICIAL SOURCES                                           │
│   DGFT · DGCI&S · CBIC · UN Comtrade · World Bank WITS       │
└──────────────────────────────────────────────────────────────┘
```

**Why data is vendored at build time.** The product does not depend on a government
portal being reachable when a manufacturer asks a question. Datasets are parsed once,
committed as versioned JSON, and reviewed on change. A portal outage degrades nothing.

---

## 3. One question, end to end

```
user question
  → /api/chat            auth + rate limit
  → agent loop           model selects a tool and its arguments
  → domain engine        deterministic lookup or arithmetic
  → vendored JSON  |  Supabase cache  |  live API
  → engine returns structured result + narrative
  → agent composes the answer
  → language check       wrong script → one corrective retry
  → NDJSON stream        progress events, then the final payload
  → client               renders answer + chart
```

Progress is streamed rather than tokens. `enforceLanguage()` inspects the **complete**
answer, so the reply cannot be released a word at a time and then corrected.

---

## 4. The manufacturer's flow, and what fires at each step

### ① LIST — the product becomes data

| | |
|---|---|
| Component | `hs/classify` → `classifyProduct` tool |
| Data | `itchs-export.json` — 12,310 official ITC-HS lines |
| Flow | description → retrieve candidates → **model selects** → 8-digit code |
| AI | **selects** from candidates. The only ambiguous step: material-vs-function traps (plastic pipe `391722` ≠ steel pipe `7306`), vernacular product names, no standard vocabulary. |
| Deterministic | The candidate set is the fixed official list. **The model cannot return a code that does not exist.** |

*Roadmap: listing by voice or photo, with a drafted spec sheet verified by the
manufacturer before publish.*

### ② ENRICH — the product becomes a trade object

Fires automatically once the code exists. **No AI is involved at this step.**

| | |
|---|---|
| Components | `hs/gst` · `hs/rodtep` · `hs/drawback` · `hs/itchs` |
| Data | 10,610 RoDTEP rates · 1,014 drawback headings · GST · export policy (free / restricted / prohibited) |
| Deterministic | Every value is a keyed lookup. Where GST is genuinely ambiguous — **97 lines carry value- or end-use splits written into the notification itself** — the system returns *every candidate and says so* rather than picking one. |

*Roadmap: certification and non-tariff barriers (CE, FDA, REACH, phytosanitary).*

### ③ TARGET — where to sell, and what it costs the buyer

| | |
|---|---|
| Components | `comtrade/tools` → `getTopImporters`, `getTradeTrend` · `tariff/landed-cost` → `composeLandedCost` |
| Data | UN Comtrade (cached, 30-day TTL) · DGCI&S, 12,402 series × 7 financial years · 82 destinations · 81 tax jurisdictions · 16 trade agreements |
| AI | **Orchestration** — turns "where do I sell?" into the right sequence of tool calls |
| Deterministic | Rankings, CAGR, duty, VAT, surcharge, landed cost. 97 pinned checks on the arithmetic alone. |

### ④ ASK — Export Saathi

| | |
|---|---|
| Components | `saathi/agent` — 10 tools, max 3 tool rounds · `saathi/language` |
| AI | Understand the question (including Devanagari) · choose tools · compose the answer · enforce reply language with one corrective retry |
| Deterministic | Every figure quoted comes from ①–③. **The agent narrates; it does not compute.** |

### ⑤ EXECUTE — documents and partners

| | |
|---|---|
| Live | `/api/generate-document` drafts commercial invoice, packing list, Certificate of Origin from the product record |
| Roadmap | Constrained partner matching against shipment size, destination, incoterm and working-capital position |

---

## 5. What AI does, and what it never touches

| Capability | AI | Deterministic |
|---|:--:|:--:|
| Understand the question (incl. Devanagari) | ● | |
| Choose which tools to call, and in what order | ● | |
| **HS code — select from the official list** | **● selects** | **● fixed 12,310-line set** |
| Duty, VAT, surcharge rates | | ● vendored government data |
| Landed-cost arithmetic | | ● pure function, 97 checks |
| FTA eligibility | | ● lookup, 16 agreements |
| RoDTEP / drawback / GST | | ● lookup, 10,610 + 1,014 |
| Market ranking and demand trend | | ● computed from Comtrade |
| Compose the answer | ● | |
| Enforce reply language | ● retry | ● script detection |

Classification is the only row with marks in both columns, and even there the model
**selects** rather than generates.

```
RETRIEVE → VALIDATE → RESPOND
```

**This is an architectural guarantee, not a prompt instruction.** A prompt can be
ignored; a fixed candidate set cannot be.

---

## 6. Model configuration

Saathi speaks the OpenAI Chat Completions dialect, so the provider is a swappable
component. The provider was migrated Groq/Llama → Gemini **without changing the agent
loop**.

| Setting | Value | Why |
|---|---|---|
| Model | `gemini-3.5-flash` | Override with `SAATHI_MODEL`. `gemini-2.5-*` is advertised by the models list but 404s on both transports — see [`model.ts`](../src/lib/saathi/model.ts). |
| `reasoning_effort` | `low` | Gemini 3.x bills hidden thinking as output without reporting it in `completion_tokens`. Measured: 5 completion + 16 prompt tokens but **212 total** — ~90% invisible reasoning. `"none"` is rejected with a 400. |
| `max_tokens` | 1200 | |
| `MAX_TOOL_ROUNDS` | 3 | System prompt (~1,970 tokens) and tool schemas (~1,660) are re-sent every round, so each round costs ~3,630 input tokens before any content. |

Retries are split by cause: `5xx` gets two fast attempts (a rejected request bills
nothing); `429` is quota rather than a blip, so it retries once and only when the
server names a sub-2-second delay.

---

## 7. Verification

Data bugs in this codebase have been silent and large, so figures are pinned to exact
values rather than sanity-checked, and every expectation is computed by hand in a
comment beside the assertion.

```bash
npm test    # typecheck + all six suites — 247 checks
```

**Tests are verified by mutation, not by passing.** A suite that only ever goes green
proves nothing, so faults are deliberately introduced to confirm the suite catches
them. Full tables are in the [README](../README.md#verification).

The clearest example: `getTradeTrend` built its series with `byYear.get(y) ?? 0`,
turning "the reporter has not filed yet" into "this market bought nothing." Because
growth was anchored on the last element, a market that grew **17%** was reported as
**`-100% total growth`** — a sentence with nothing visibly wrong with it. Three mutants
now guard the fix.

---

## 8. Security

- Supabase Postgres with **Row Level Security**; the trade cache is deny-all and
  reachable only by a service-role client that never touches the browser
- Saathi is auth-gated and per-user rate limited, so the API key cannot be drained by
  anonymous traffic
- Secrets are environment-only; `.env*` is gitignored and no key is committed

---

## 9. Where the system refuses to answer

This is deliberate, and it is the design principle the rest of the architecture exists
to support.

- **Preferential FTA rates.** We hold agreement *eligibility*, not per-line rates. The
  UAE's own 320-page signed CEPA text contains a page titled *"Annex 2B: Schedule of
  Specific Tariff Commitments"* followed by nothing — a cover page with no table. So
  Saathi says an agreement exists and the buyer may pay less, and tells the user to
  confirm the line with their customs broker.
- **Ambiguous GST.** 97 lines carry value- or end-use splits. All candidates are
  returned; none is chosen.
- **Unfiled trade years.** Reported as unfiled, never imputed as zero.
- **Somalia's VAT.** Deliberately absent rather than guessed.

A wrong duty figure does not look wrong. A manufacturer prices a real container on it.
