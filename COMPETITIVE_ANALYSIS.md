# Competitive Analysis — ArthaFlow Global

**Prepared:** 27 July 2026
**Method:** Direct review of competitor websites (landing, pricing, how-it-works, product
pages) plus web search for company, founder and funding data.
**Confidence note:** Everything below about competitor *features and pricing* is taken
from their own public pages on the date above and is verifiable. Claims about their
*traction, team and funding* are weak — neither company publishes it and no funding
records surfaced. Where we do not know something, this document says so rather than
estimating.

---

## 1. Summary

ArthaFlow has two direct competitors, both Indian, both AI-positioned, both live:

- **ImpexQ** (impexq.com) — narrow, cheap, self-serve trade tools. ₹499/month.
- **impex.in** — a near-identical positioning to ArthaFlow's own. ₹2,999/month.

Neither is a logistics platform (Cogoport, Shiprocket) or a data vendor (Volza). They
are exactly what ArthaFlow describes itself as: AI trade intelligence for Indian MSME
exporters. They should replace the competitor set used in investor materials to date.

**The single most important finding:** ArthaFlow's listed pricing is 6–20× ImpexQ's
for a product that currently does *less* of an exporter's weekly work. The "₹2 lakh/year
consultant" comparison used throughout our pitch materials is no longer the comparison a
customer actually makes.

**The single strongest defence:** neither competitor has a transaction layer. Both are
subscription tools with a ceiling. ArthaFlow's freight, insurance and trade-finance
economics are the reason this is an infrastructure business rather than a utility — and
that argument, not the software, is what justifies the raise.

---

## 2. Competitor profiles

### ImpexQ — impexq.com

**Positioning:** "India's Smartest Trade Intelligence Platform."
**Model:** Self-serve SaaS, freemium, credit-metered buyer contacts.
**Distribution:** Web app plus a **Chrome extension** ("HSN Scout"), marketed through
Instagram and YouTube walkthroughs.

**Product:**
- 8-digit ITC-HS code search with GST rate, BCD duty and licensing requirements
- Landed-cost calculator (Ex-Works → CIF, duties, surcharges), with FTA comparison
- RoDTEP and Duty Drawback rate finder
- FTA eligibility checker across 21 countries
- Buyer discovery — **6,000+ companies, 80+ countries, 65 product categories**
  (46% have email, 65% have phone)
- Export-market intelligence, sourced from BACI/COMTRADE
- Document generator and "AI agentic search" — Business tier only, and notably *absent*
  from their own How It Works page, suggesting these are new or thin

**Pricing:**

| Tier | Price | Key limits |
|---|---|---|
| Free | ₹0 | 3 HSN searches/day, 3 calculator uses/day, company names only |
| Pro monthly | ₹499/mo | Unlimited searches, 100 buyer contacts/month |
| Pro yearly | ₹4,999/yr (₹417/mo) | 5,000 contacts/year as one pool |
| Business monthly | ₹999/mo | 1,000 contacts/month with rollover, doc generator, buyer CRM |
| Business yearly | ₹9,999/yr (₹833/mo) | as above |
| Enterprise / API | Custom | REST APIs, SLA, white-label |
| Custom buyer research | ₹1,999 one-time | Targeted importer list in 5–7 days |

**Traction:** Testimonials claim deal closures in 1–7 weeks, 18% duty saving on a
shipment, 12+ verified buyers found. Unverifiable. No funding, founder or team
information found in search — most likely bootstrapped and small.

### impex.in

**Positioning:** AI trade intelligence for Indian MSMEs. Cites "$800B+ annual trade"
and "8M+ MSMEs" unable to export for lack of intelligence and compliance guidance.

**Product — five stated layers:**
1. Trade intelligence — AI over government trade data, global demand maps
2. Buyer–seller matching with verified international counterparts
3. Compliance engine — HS codes, duties, certifications, documentation
4. **Documentation AI — export-ready documents in English from Hindi descriptions**
5. AI-generated product-specific market reports

**Pricing:** Free (5 searches/day) · Pro ₹2,999/mo · Enterprise custom (API, dedicated
support).

**Why this one matters more:** layers 1, 3 and 4 are, respectively, Export Saathi,
our compliance/document engine, and our vernacular differentiator. This is the closest
competitor ArthaFlow has, and its positioning statement could be mistaken for ours.

**Relationship to ImpexQ:** none stated on either site. Treat as separate companies.

---

## 3. Feature comparison

| Capability | ArthaFlow | ImpexQ | impex.in |
|---|---|---|---|
| HS classification | 6-digit international | **8-digit ITC-HS + GST + BCD** | HS + duties |
| Grounded in real nomenclature | **Yes — retrieve-then-choose, cannot invent a code** | "AI-trained on customs rules" | Not stated |
| Landed-cost calculator | **No** | Yes, unlimited | Yes |
| RoDTEP / Duty Drawback | **No** | Yes | Not stated |
| FTA eligibility | **No** | Yes, 21 countries | Not stated |
| Export document generation | Yes | Business tier | Yes, Hindi → English |
| Market/demand discovery | Yes — UN Comtrade + World Bank | Yes — BACI/COMTRADE | Yes — "government data" |
| Buyer database | **No** | 6,000 companies / 80 countries | Claims matching |
| Multilingual | Conversational, Devanagari-native | Not stated | Hindi input |
| Freight / insurance / trade finance | **Planned — neither competitor has this** | No | No |
| Browser extension | No | **Yes** | No |
| Public API | No | Enterprise tier | Enterprise tier |

---

## 4. Pricing reality

| Product | Entry paid tier |
|---|---|
| ImpexQ Pro | **₹499/mo** |
| ImpexQ Business | ₹999/mo |
| impex.in Pro | ₹2,999/mo |
| ArthaFlow — financial model | ₹1,500 / ₹3,500 / ₹8,000 |
| ArthaFlow — live website | Free / **₹9,999** / **₹29,999** |

Two problems:

1. **Internal inconsistency.** The website, the financial model and the outbound emails
   quote three different price sets. This must be reconciled to one before further
   investor conversations — it is the kind of discrepancy diligence finds immediately.
2. **External positioning.** Against a visible ₹499 competitor, our pitch materials'
   "₹2 lakh/year consultant" anchor is the wrong comparison. A manufacturer evaluating
   us will compare ₹499 to our number, not ₹2,00,000 to our number.

The defensible answer is **not** to cut price to ₹499. It is to be explicit that the
subscription is an entry point into a transaction business, and that we earn when the
manufacturer ships. That is a different business from the one ImpexQ is running.

---

## 5. Honest assessment of our gaps

- **No buyer database.** 6,000 verified companies is thin and decays, but it is 6,000
  more than we have. In this category buyer discovery reads as table stakes.
- **No duty, incentive or FTA tooling.** These are the highest-frequency jobs an
  exporter has — weekly, concrete, quantifiable. We built the quarterly job (which
  market) and skipped the weekly ones.
- **6-digit HS only.** Saathi correctly tells users the final two ITC-HS digits need
  DGFT confirmation. ImpexQ ships 8-digit with GST and BCD attached. Ours is the more
  honest answer and the less useful one.
- **No daily-habit surface.** Their Chrome extension makes them a utility opened on a
  Tuesday afternoon. We are a destination visited when starting something new.
- **Our best engineering is invisible.** The nomenclature grounding, the ×500 Comtrade
  aggregation fix, the refusal to fabricate — all real, all differentiating, none of it
  legible on a landing page next to a competitor claiming the same words.

## 6. Where we are genuinely stronger

- **Transaction layer.** Freight, marine insurance, trade finance, shipment
  orchestration. ImpexQ's ceiling is ₹499 × N, forever. Ours compounds with customer
  export volume. This is the moat and the investment case.
- **Data integrity as architecture.** We retrieve from the real HS 2022 nomenclature so
  the model cannot invent a code; we disclose mirror and World Bank group-level sources
  rather than passing them off as exact; we return "unavailable" instead of a plausible
  guess. A wrong HS code produces a confidently wrong answer a manufacturer cannot
  detect — this is the failure mode that matters in trade, and we engineered against it.
- **Vernacular depth.** Not "Hindi supported" as a checkbox — Devanagari tokenisation
  and an alias layer that resolves `चमड़े के बैग` to 420221 through the real
  nomenclature.
- **Full-journey ambition.** Both competitors stop at intelligence. We intend to carry
  the manufacturer to a shipped container.

## 7. Threats

1. **Price anchoring.** ImpexQ has demonstrated this market can be served profitably at
   ₹499. That sets a reference price we must either beat on value or transcend by
   selling a different category of thing.
2. **impex.in's positioning overlap.** If they execute, they reach our story first with
   a live product and a lower price.
3. **Feature velocity.** A calculator, RoDTEP lookup and FTA checker are weeks of work.
   Competitors can add market intelligence more easily than we can add a buyer network.
4. **Both are bootstrapped-looking.** No funding pressure means no forced growth, but it
   also means low burn and long survival.

## 8. Recommended actions

| # | Action | Why |
|---|---|---|
| 1 | Reconcile pricing to one number across site, model and outbound | Diligence-visible inconsistency |
| 2 | Rebuild the pitch's competitive framing around the transaction layer, not consultant cost | The ₹2L anchor no longer holds |
| 3 | Replace competitor names in all investor forms with ImpexQ, impex.in and consultants/CHAs | Shows we know our market |
| 4 | Scope duty/RoDTEP/FTA/landed-cost tooling | The weekly-use jobs we currently lack |
| 5 | Decide buyer-discovery strategy: build, partner, or explicitly de-scope | Currently an unexplained absence |
| 6 | Make the integrity story legible on the site | Our best differentiator is invisible |

---

## Sources

- https://impexq.com/ — landing, features, testimonials
- https://impexq.com/pricing — full tier and limit detail
- https://impexq.com/how-it-works — data sources, workflow
- https://impexq.com/find-buyers — database size, coverage, contact fill rates
- https://impex.in/ — positioning, five product layers, pricing
- Web search for ImpexQ founder/funding — no records found
