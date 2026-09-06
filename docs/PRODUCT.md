<div align="center">

# ArthaFlow Global
### Product &amp; Company Report

**AI-native export infrastructure for India's manufacturers**

`arthaflowglobal.com` · Mumbai, India

</div>

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [The problem](#2-the-problem)
3. [Who we serve](#3-who-we-serve)
4. [The solution](#4-the-solution)
5. [What is live today](#5-what-is-live-today)
6. [Technology](#6-technology)
7. [Data provenance](#7-data-provenance)
8. [Engineering practice](#8-engineering-practice)
9. [Market](#9-market)
10. [Business model](#10-business-model)
11. [Competitive position](#11-competitive-position)
12. [Traction](#12-traction)
13. [Roadmap](#13-roadmap)
14. [Team](#14-team)
15. [Security](#15-security)
16. [What we deliberately refuse to do](#16-what-we-deliberately-refuse-to-do)

---

## 1. Executive summary

ArthaFlow Global is a software platform that lets a small Indian manufacturer run an
export themselves.

To sell abroad, a manufacturer must classify the product under an 8-digit customs code,
calculate the duty and tax the buyer will pay at destination, check whether a trade
agreement reduces it, claim the government incentives the shipment earns, and produce a
dozen compliance documents. Today each step needs a different intermediary — a customs
broker, a freight forwarder, a consultant — and the process is available only in English.

We do all of it in one platform, in the manufacturer's own language, from official
government data.

| | |
|---|---|
| **Product** | Live at `arthaflowglobal.com` |
| **Coverage** | 12,310 official ITC-HS lines · 82 destinations · 81 tax jurisdictions · 16 trade agreements |
| **Verification** | 247 automated checks, mutation-verified |
| **Traction** | 15 manufacturers onboarded · 10 active · pre-revenue · 1 signed partnership |
| **Team** | 2 founders, 4 years working together |

**The distinguishing claim.** Anyone can wrap a language model around trade questions.
The hard part is the data layer that makes the answer safe to act on — and the
discipline to say "I don't know" where the official source dead-ends. A wrong duty
figure does not look wrong; a manufacturer prices a real container on it.

---

## 2. The problem

### 2.1 India makes export-quality products, but exporting still requires an export department

| To export, you must… | Today that means |
|---|---|
| Classify the product to an 8-digit ITC-HS code | a customs broker |
| Know what duty and tax the buyer pays | a consultant |
| Check whether a trade agreement reduces it | a consultant |
| Claim the incentives the shipment earns | **usually nobody — it goes unclaimed** |
| Produce the compliance documents | a broker or CHA |

Four of those five steps cost money. One is money nobody is collecting.

### 2.2 The evidence

**Only 72,775 MSMEs export.**
72,775 distinct Udyam-registered MSME exporters traded in FY2022-23. They shipped
**$125.5 billion** — **27.8%** of India's **$451.1 billion** merchandise exports. That
is an average of roughly **₹13.9 crore** per exporter: small businesses, not
conglomerates.
*Source: DGCI&S, MSME Sector EXIM Report 2022-23, Department of Commerce.*

**The national target does not close with that base.**
India is targeting **$1 trillion in merchandise exports by 2030-31** — roughly 2.2× the
FY2022-23 figure. Holding MSME share constant, MSME exports must go from $125.5B to
about $278B. Through the same 72,775 firms, each would need to more than double. The
structural path is a wider base.
*Source: Press Information Bureau, Ministry of Commerce &amp; Industry, 29 April 2026.*

**The government's own diagnosis names the same bottleneck.**
Reviewing the Export Promotion Mission — described as a flagship MSME-focused initiative
addressing key bottlenecks faced by exporters — the Union Minister of Commerce &amp;
Industry directed that *"the benefits of all schemes must reach exporters at the ground
level, particularly genuine and first-time exporters and MSMEs."*
*Source: as above.*

### 2.3 What this means

The incentives already exist. The data already exists. What is missing is the layer that
gets them to the manufacturer.

> Today the number of Indian exporters is capped by the number of consultants. It should
> be capped by the number of manufacturers with something worth selling.

---

## 3. Who we serve

**Ideal customer.** An Indian MSME manufacturer with ₹5–50 crore turnover who already
makes an export-quality product and is either exporting in small volumes through an
intermediary, or wants to and has not started. Concentrated in clusters: Tiruppur,
Ludhiana, Kanpur, Moradabad, Rajkot, Surat.

**Who makes the buying decision — and what it implies.**

| | |
|---|---|
| **Owner-led** | The promoter decides, usually in one conversation. No procurement function, no committee, no RFP — so a short sales cycle. |
| **Cluster-led** | They buy on a referral from someone in their own cluster, not from a website. One referral can reach an entire cluster. |
| **Language-led** | The decision-maker often does not operate in English. This is why Export Saathi answers in Hindi and Marathi, and why it is an access question rather than a convenience one. |

**Channels, not customers.** Export Promotion Councils and cluster associations reach
thousands of these firms at once. They do not buy the product; they introduce it.

---

## 4. The solution

Three pillars on one foundation of official data.

### Pillar 1 — Market intelligence: Export Saathi
Tells the manufacturer what to sell, where, and at what cost.
- Classifies the product to the correct 8-digit ITC-HS code — retrieved from the
  official nomenclature, never generated
- Prices the shipment: duty for 82 destinations, VAT/GST for 81
- Checks eligibility across 16 trade agreements
- Surfaces RoDTEP and drawback entitlement per shipment
- Answers in Hindi and Marathi

### Pillar 2 — Software: the manufacturer dashboard
Runs the export from one place.
- Product catalogue with saved HS codes
- Generates compliance documents — commercial invoice, packing list, HS classification
  report, product export sheet
- Shipment tracking
- Partner selection at each step

### Pillar 3 — Network: partner network
Completes the trade.
- Logistics and warehousing — **signed**
- Freight and cargo insurance — in progress
- Trade finance — in progress

**The foundation.** Every figure comes from a government source. Where the source
dead-ends, the system says so instead of estimating.

> Software can be copied. A partner network has to be built.

---

## 5. What is live today

| Capability | Detail |
|---|---|
| **HS classification** | Retrieve-then-choose over 12,310 official ITC-HS lines. The model selects; it cannot generate a code that does not exist. |
| **Landed cost** | Duty for 82 destinations, VAT/GST for 81, correct CIF/FOB basis, measures above MFN. 97 pinned arithmetic checks. |
| **Trade agreements** | Eligibility across 16 agreements, with Certificate-of-Origin guidance. Eligibility, not invented rates. |
| **Incentives** | 10,610 RoDTEP rates, 1,014 drawback headings, GST — including 97 lines flagged as genuinely ambiguous rather than resolved. |
| **Market intelligence** | UN Comtrade plus 7 financial years of DGCI&S export data — top importers, demand trend, CAGR, market rankings. |
| **Export Saathi** | 10-tool agent, max 3 tool rounds, multilingual, streamed progress. |
| **Document generation** | Product export sheets, HS classification reports, proforma invoices. |
| **Public tools** | HSN search, landed-cost calculator, `/export/[slug]` SEO pages, growth tables. |

---

## 6. Technology

Full detail in **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**. In summary:

**Stack.** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 ·
Supabase (Postgres with Row Level Security) · Vercel. Saathi runs on Gemini
`gemini-3.5-flash` at `reasoning_effort: low`, through the OpenAI-compatible endpoint.

**The organising idea.** One classification unlocks the entire system — the 8-digit
ITC-HS code is the join key across every dataset. So the only genuinely ambiguous
problem is getting the code right, and that is the one place a model is involved in an
answer.

**What AI does:** understands the question including Devanagari, chooses which of 10
tools to call and in what order, selects an HS code from a fixed candidate set, composes
the answer, and enforces the reply language.

**What AI never touches:** every duty, VAT, surcharge and incentive rate; every
calculation; every source citation. Those come from vendored government data and
deterministic engines.

```
RETRIEVE → VALIDATE → RESPOND
```

This is an architectural guarantee, not a prompt instruction. A prompt can be ignored; a
fixed candidate set cannot be.

**Model-agnostic by design.** The provider was migrated Groq/Llama → Gemini without
changing the agent loop. The model is a swappable component; the data layer is the
product.

---

## 7. Data provenance

| Dataset | Source | Shape |
|---|---|---|
| ITC-HS tariff lines | DGFT | 12,310 lines, 8-digit, with export policy |
| RoDTEP rates | DGFT notification schedule | 10,610 lines, with per-unit caps |
| Duty drawback | DGFT | 1,014 headings, 4-digit |
| GST | CBIC | with 97 genuinely ambiguous lines flagged |
| India export values | DGCI&S TIA portal | 12,402 series, FY2019-20 → FY2025-26 |
| Import duty | World Bank WITS / UNCTAD TRAINS | 82 destinations |
| VAT/GST at destination | national revenue authorities | 81 jurisdictions |
| Trade flows | UN Comtrade | cached, 30-day TTL |

**Vendored at build time.** Seven pipeline scripts parse official sources into versioned
JSON, committed to the repository. The product does not depend on a government portal
being reachable when a manufacturer asks a question, and any change to a dataset is a
reviewable diff.

---

## 8. Engineering practice

```bash
npm test    # typecheck + all six suites — 247 checks
```

| Suite | Checks |
|---|--:|
| `test:landed-cost` | 97 |
| `test:hs` | 60 |
| `test:trend` | 36 |
| `test:india-exports` | 28 |
| `test:dgcis` | 17 |
| `test:rate-limit` | 9 |
| **Total** | **247** |

**Tests are verified by mutation, not by passing.** A suite that only ever goes green
proves nothing, so faults are deliberately introduced to confirm the suite catches them.

| Deliberate break | Fails | Silent error it would have shipped |
|---|--:|---|
| US duty charged on CIF, not FOB | 7 | duty overstated ₹7,360 |
| VAT on CIF instead of CIF+duty | 3 | VAT understated ₹13,486 |
| RoDTEP per-unit cap ignored | 2 | rebate overstated ₹14,000 |
| Surcharge scope collapsed to two values | 4 | an 18% exposure hidden entirely |
| Unreported trade years imputed as zero | 4 | a market that grew 17% reported as `-100% total growth` |

That last one is the clearest illustration of why this matters. `getTradeTrend` built
its series with `byYear.get(y) ?? 0`, turning "the reporter has not filed yet" into
"this market bought nothing." A market that grew 17% over four years was reported as a
total collapse — in a sentence with nothing visibly wrong with it.

---

## 9. Market

**Beachhead.** 72,775 Udyam-registered MSME exporters who traded in FY2022-23. These
firms have the problem today and are reachable.

```
72,775 exporters  ×  ₹42,000 per year (Growth plan)  =  ₹305 Cr
```

Serviceable market from today's exporters, **subscription revenue alone**. It excludes
transaction revenue and every exporter India creates on the way to $1 trillion.

**We start with a market that already exports.** The expansion vector is the growth of
the exporter base itself, which the national target requires.

**Beyond India.** The tariff, VAT, trade-agreement and market-intelligence engines are
country-agnostic. Only the domestic layer — DGCI&S, RoDTEP, DGFT — is India-specific.
India is our first market, not our market.

---

## 10. Business model

### Subscription — published and live

| Plan | Price | For |
|---|--:|---|
| Free | ₹0 | 3 AI documents/month, HS classification, export readiness score, 10 Saathi questions |
| Starter | ₹1,500/mo | First-time exporters |
| Growth | ₹3,500/mo | Active exporters — unlimited documents |
| Enterprise | ₹8,000/mo | Multi-product, multi-market manufacturers |
| Self-export consultation | ₹15,000 one-time | Guided first shipment |

### Transaction revenue

The subscription is the entry point, not the whole relationship. As a manufacturer
begins shipping, revenue lines open alongside the partner network:

- Platform transaction fee on facilitated export value
- Freight commission
- Insurance commission (share of premium)
- Trade finance referral
- Back-to-back trading gross profit

> **Note for diligence:** the platform transaction-fee rate is stated inconsistently
> across older internal documents (5–7% in one, 1.5% of export GMV in another). Treat
> the subscription figures above — which are live on the pricing page — as authoritative,
> and confirm the take rate directly with the founders before modelling it.

---

## 11. Competitive position

**The alternatives solve a step. ArthaFlow connects the trade.**

| Today | What they provide | What is missing |
|---|---|---|
| Customs broker | Classification + compliance | Market intelligence, costing, execution |
| Freight forwarder | Shipping + logistics | Every decision made before the shipment |
| Export consultant | Advice + documentation | Always-on software, and execution |
| Government portals | The raw official data, free | Usable form — seven portals, PDF schedules, no path from product to code to duty to incentive |
| Generic AI | Answers | Verified trade data, deterministic calculation, workflow |

### If a foundation-model provider ships this tomorrow

**They have the model. We have the system.** Our value isn't the LLM — it's the verified
data pipeline, the domain engines and the export workflow underneath it. A better model
plugs in and makes us better.

**The data compounds on two clocks.** Already built: 12,310 tariff lines, 10,610 RoDTEP
rates, 7 years of DGCI&S filings, 247 checks — a corpus that took months and exists
nowhere else in usable form. Compounding from here: every manufacturer → product →
market → shipment → outcome adds structured trade intelligence no general model can
reach.

**Execution isn't a chat feature.** Partner integrations, shipment requirements,
transaction history and eventually underwriting relationships. Infrastructure that
cannot be bought with a model API.

> The model can be swapped. The infrastructure cannot.

---

## 12. Traction

| | |
|---|---|
| Manufacturers onboarded | 15 |
| Actively using the platform | 10 |
| Revenue | Pre-revenue |
| Partnerships signed | 1 — logistics and warehousing |
| Recognition | Winner, Saarthi pitching competition · featured by riidl |
| Incubation | riidl, KJ Somaiya's innovation centre |

**Stated plainly:** we have built more product than we can currently sell. The
constraint is not the product — it is commercial reach into a market that buys on
referral and trust.

---

## 13. Roadmap

Each layer earns the next.

### Phase 1 — next 3 months · Connect the ecosystem
**Product:** voice and image product listing (multimodal onboarding) · certification and
non-tariff-barrier data layer · **partner portal** — API and dashboard where logistics,
insurance and finance partners see live seller demand and shipment requirements.
**Business:** convert active pilots to first paying customers · sign finance, insurance
and trade-service partners onto the portal.

*Partners don't get a referral email. They get an API and structured, live seller demand
— which is why they sign, and why they stay.*

### Phase 2 — 2027 · Automate the transaction
**Product:** claim automation — file RoDTEP and drawback rather than only surfacing them
· Certificate of Origin filing through DGFT's digital platform · partner matching engine.
**Business:** seed round · scale across three export clusters.

### Phase 3 — 2028–2030 · Become the trade rail
**Product:** verified export history becomes underwriting data · buyer discovery on the
demand side.
**Business:** trade finance layer · second country.

### The 2030 target

| | |
|---|---|
| Paying manufacturers | **2,500** — 3.4% of India's 72,775 MSME exporters |
| Export value facilitated | **₹2,500 Cr** |
| ARR | **₹60 Cr** |

₹2,500 Cr is approximately $300M, or 0.03% of India's $1 trillion merchandise goal.

---

## 14. Team

### Sarthak Wage — Founder &amp; CEO
Second-time founder. Previously CTO of a 3D design studio — raised multiple funding
rounds and grew revenue to seven figures. Owns product, data pipeline and go-to-market.
Robotics &amp; AI, KJ Somaiya.

### Sameer Morya — Co-founder &amp; CTO
Logistics and supply chain background — understands how goods actually move, not just
how software does. Built enterprise-grade systems in his previous organisation. Owns the
agent architecture and engineering systems. Robotics &amp; AI, KJ Somaiya.

**Four years building together.** Same batch, same engineering programme — one team long
before this company existed. Based in Mumbai.

> Neither of us came from trade. One came from logistics, one from building and scaling a
> company. We spent the last year reading government tariff schedules line by line —
> because the reason this is still unsolved is that the work is unglamorous, not that
> it's hard.

---

## 15. Security

- **Supabase Postgres with Row Level Security.** The trade cache is deny-all and
  reachable only by a service-role client that never touches the browser.
- **Saathi is auth-gated and per-user rate limited**, so the API key cannot be drained by
  anonymous traffic.
- **Secrets are environment-only.** `.env*` is gitignored; no key is committed. The
  repository history has been scanned for credential patterns.
- **Data residency.** Sovereign inference on Indian infrastructure is on the long-term
  roadmap; the architecture is model-agnostic specifically so that move requires no
  product change.

---

## 16. What we deliberately refuse to do

This is the design principle the rest of the system exists to support.

- **We do not quote preferential FTA rates.** We hold agreement eligibility, not
  per-line rates. The UAE's own 320-page signed CEPA text contains a page titled
  *"Annex 2B: Schedule of Specific Tariff Commitments"* followed by nothing — a cover
  page with no table. So Saathi says an agreement exists, that the buyer may pay less,
  and that the line must be confirmed with a customs broker.
- **We do not resolve ambiguous GST.** 97 lines carry value- or end-use splits written
  into the notification itself. All candidates are returned; none is chosen.
- **We do not impute unfiled trade years.** A year the reporter never filed is reported
  as unfiled, not as zero.
- **We do not guess a VAT rate we cannot source.** Somalia is deliberately absent.

---

<div align="center">

**ArthaFlow Global** · `arthaflowglobal.com`

Every number in this document traces to a government source — and to a test that fails
if it drifts.

</div>
