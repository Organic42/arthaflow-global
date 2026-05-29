<p align="center">
  <strong style="font-size: 32px;">ArthaFlow Global</strong>
</p>

<p align="center">
  <em>Your AI-powered export department — without the overhead.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stage-Pre--Seed-blue" alt="Stage" />
  <img src="https://img.shields.io/badge/Stack-Next.js_16_%7C_Tailwind_%7C_Supabase-black" alt="Stack" />
  <img src="https://img.shields.io/badge/Screens-14%2F14-brightgreen" alt="Screens" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

---

## The Idea

India has **57 million registered MSMEs**. Only **0.3% export**. Not because their products aren't good enough — because the export infrastructure doesn't exist.

**ArthaFlow Global** is a tech-enabled export infrastructure platform that acts as the outsourced export department for Indian manufacturers. We remove every barrier between a manufacturer making a product and getting paid in dollars.

Using AI-powered document generation, HS code classification, automated compliance workflows, curated buyer matching, and logistics orchestration — ArthaFlow transforms any domestic manufacturer into an export-ready business in **days, not months**.

### Core Value Proposition

| For Manufacturers | For Buyers |
|---|---|
| Zero export expertise needed | Verified, quality-checked suppliers |
| AI generates all documentation in 30 seconds | Structured product catalogues with specs |
| End-to-end logistics handled | Transparent pricing and timelines |
| Get paid in dollars to your bank account | Single point of contact for procurement |

---

## Market Opportunity

| Metric | Value |
|--------|-------|
| Registered MSMEs in India | 57 Million |
| Currently Exporting | 0.3% (1.73 Lakh) |
| India's Total Exports (FY25) | $821 Billion |
| MSME Export Growth (4-year) | 3x |
| MSMEs with Export-Ready Products | ~5 Million |
| MSMEs with Export Awareness | ~500K |

**The gap is infrastructure, not capability.** There are 5 million manufacturers with products viable for international markets who don't export because they can't navigate IEC registration, HS codes, shipping bills, buyer discovery, freight forwarding, customs clearance, and international payments.

### Target Segments

- **Primary:** Engineering goods manufacturers (CNC, hydraulics, auto components, forgings) in Maharashtra, Gujarat, Tamil Nadu
- **Secondary:** Textiles, chemicals, handicrafts, agricultural products
- **Geography:** Tier 2/3 industrial cities — Pune, Nashik, Coimbatore, Rajkot, Ludhiana

---

## How It Works

```
[1] Onboard        [2] AI Generates       [3] We Match &        [4] Get Paid
Your Business  -->  Export Documents  -->   Ship for You    -->   in Dollars
                                                        
Register, upload    Product sheets,        Verified buyer        Secure international
docs, add products  HS codes, invoices     connections +         payments to your
in 10 minutes       in 30 seconds          end-to-end logistics  bank account
```

### Platform Workflow

1. **Manufacturer Onboarding** — Company info, product catalogue, certifications, IEC verification
2. **AI Document Generation** — Product export sheets, HS code classification, proforma invoices generated automatically
3. **Export Readiness Scoring** — Gamified 100-point compliance score tracking registration, certifications, and documentation
4. **Buyer Matching** — Curated international buyer connections from verified trade channels (buyer details revealed only after mutual interest)
5. **Shipment Tracking** — Real-time timeline from order confirmation through customs clearance to delivery
6. **Document Vault** — Secure cloud storage for all certificates, licenses, and AI-generated documents

---

## Business Model

### Three-Phase Evolution

| Phase | Model | Revenue Mechanism |
|-------|-------|-------------------|
| **Phase 1 — Service** | Tech-enabled export agency | Monthly retainer + success fees per shipment |
| **Phase 2 — Platform** | SaaS + buyer marketplace | Subscription tiers + transaction fees + network effects |
| **Phase 3 — Trading** | Proprietary trading house | Buy ex-factory, sell CIF internationally under ArthaFlow brand |

### Pricing Tiers

| Plan | Price | For |
|------|-------|-----|
| **Starter** | Free | Manufacturers exploring exports — 3 AI docs/month, HS classifier, readiness score |
| **Growth** | ₹9,999/mo | Active exporters — unlimited AI docs, buyer inquiries, WhatsApp notifications |
| **Managed** | ₹29,999/mo | Full-service — dedicated export manager, logistics orchestration, compliance handholding |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **UI** | Tailwind CSS 4, shadcn/ui, Lucide Icons |
| **Fonts** | Space Grotesk (headings), DM Sans (body), JetBrains Mono (code) |
| **Backend** | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| **AI** | Claude API for document generation |
| **Deployment** | Vercel (preview + production) |
| **Design System** | Navy #0B1D3A + Action Blue #2563EB + Artha Gold #D4A843 |

### Architecture

```
app/
├── (public)/           # Marketing pages (Homepage, Pricing, Blog)
│   └── layout.tsx      # PublicNav + Footer
├── (auth)/             # Login/Register, Onboarding
│   └── layout.tsx      # No nav/footer
├── (dashboard)/        # All authenticated app screens
│   └── layout.tsx      # DashNav wrapper
├── (admin)/            # Internal ops dashboard
│   └── layout.tsx      # Sidebar nav
└── not-found.tsx       # 404 page
```

---

## Development Phases

### Phase 1 — Foundation + UI (Weeks 1-2) ✅ Complete

- [x] Next.js project scaffold with TypeScript + Tailwind + shadcn/ui
- [x] Design system: ArthaFlow color palette, typography, spacing tokens
- [x] Core components: Button variants, Badge, Input, ProgressBar, StatCard, HoverCard, EmptyState
- [x] Layout components: PublicNav, DashNav, Footer with dark mode toggle
- [x] All 14 screens built with mock data
- [x] Responsive breakpoints (1100px, 900px, 640px)
- [x] Dark/light mode with localStorage persistence

### Phase 2 — Auth + Database (Weeks 3-4) 🔜 Next

- [ ] Supabase project setup + environment variables
- [ ] Database schema: profiles, products, documents tables with RLS
- [ ] Auth: email/password + Google OAuth via Supabase Auth
- [ ] 4-step onboarding writing to real database
- [ ] Document upload to Supabase Storage
- [ ] Auth middleware + route protection

### Phase 3 — Core Features (Weeks 4-5)

- [ ] Dashboard with real Supabase data (counts, activity log)
- [ ] Product Catalogue CRUD
- [ ] Document Vault with real file management

### Phase 4 — AI + Business Logic (Weeks 5-6)

- [ ] AI Document Generator via Claude API (real generation)
- [ ] PDF export for generated documents
- [ ] Buyer Inquiries with real inquiry management
- [ ] Shipment Tracker with live status updates

### Phase 5 — Polish + Admin (Weeks 6-7)

- [ ] Mobile PWA with service worker
- [ ] Admin dashboard with role-based access
- [ ] Empty states wired into all screens
- [ ] Error boundaries + loading skeletons

### Phase 6 — Production (Weeks 7-8)

- [ ] Vercel deployment with custom domain
- [ ] SEO: metadata, OpenGraph, sitemap
- [ ] Email notifications (verification, inquiry alerts)
- [ ] Analytics + event tracking
- [ ] Smoke tests for core user flow

---

## Screens

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 1 | Homepage | `/` | Hero, stats, problem cards, features grid, testimonial, CTA |
| 2 | Pricing | `/pricing` | 3-tier pricing cards, FAQ accordion |
| 3 | Blog | `/blog` | Featured article, knowledge hub grid |
| 4 | Login/Register | `/login` | Split layout, Google OAuth, form toggle |
| 5 | Onboarding | `/onboarding` | 4-step wizard (Company, Products, Readiness, Documents) |
| 6 | Dashboard | `/dashboard` | Stat cards, activity feed, readiness sidebar |
| 7 | AI Doc Generator | `/documents/generate` | Product selector, skeleton loading, document preview |
| 8 | Document Vault | `/documents` | Category tabs, search, status table, pagination |
| 9 | Buyer Inquiries | `/inquiries` | Split panel, filter tabs, requirements, interest actions |
| 10 | Shipment Tracker | `/shipments` | Timeline visualization, shipment details, attached docs |
| 11 | Product Catalogue | `/products` | Product cards grid, status badges, add product |
| 12 | Mobile Dashboard | `/mobile` | PWA layout, circular progress ring, bottom nav |
| 13 | Admin/Ops | `/admin` | Sidebar nav, task list, onboardings table |
| 14 | Empty States | `/states` | 404, welcome, no-data states gallery |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Organic42/arthaflow-global.git
cd arthaflow-global

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables (for Phase 2+)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=your_claude_api_key
```

---

## Summary

ArthaFlow Global sits at the intersection of **AI**, **trade infrastructure**, and **India's manufacturing boom**. The platform turns the complex, fragmented export process into a single streamlined workflow — from factory floor to international payment.

**The moat:** Every manufacturer onboarded, every document generated, every shipment tracked creates proprietary data that makes the platform smarter, the buyer matching more accurate, and the logistics more efficient. The compounding data advantage deepens with each transaction.

**The opportunity:** 5 million Indian manufacturers with export-ready products, zero infrastructure to reach global markets. ArthaFlow is that infrastructure.

---

<p align="center">
  <strong>ArthaFlow Global</strong> — Export. Simplified.<br/>
  <em>Pre-Seed Stage | Mumbai, India | May 2026</em>
</p>
