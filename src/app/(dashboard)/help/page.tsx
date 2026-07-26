"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  ChevronDown,
  HelpCircle,
  BookOpen,
  Truck,
  FileText,
  Shield,
  CreditCard,
  Users,
  Globe,
  Settings,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";

// ── FAQ Data ─────────────────────────────────────────────────────────────────

interface FAQ {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  faqs: FAQ[];
}

const faqSections: FAQSection[] = [
  {
    title: "Getting Started",
    icon: <BookOpen size={18} />,
    color: "text-action-blue",
    bg: "bg-blue-bg",
    faqs: [
      {
        q: "What is ArthaFlow Global?",
        a: "ArthaFlow Global is an AI-powered export infrastructure platform designed specifically for Indian MSME manufacturers. We help you navigate the entire export process — from documentation and compliance to buyer discovery and shipment tracking — so you can focus on manufacturing while we handle the complexity of global trade.",
      },
      {
        q: "Who is ArthaFlow designed for?",
        a: "ArthaFlow is built for Indian MSME manufacturers who want to start exporting or scale their existing export operations. Whether you make precision components, textiles, chemicals, or any other product, our platform adapts to your industry and helps you reach verified global buyers.",
      },
      {
        q: "How do I get started with ArthaFlow?",
        a: "Simply create an account and complete the 4-step onboarding process: (1) Enter your company details and GST number, (2) Add your products to the catalogue, (3) Fill in your export readiness information (IEC, AD Code), and (4) Upload any existing documents. The entire process takes about 10 minutes.",
      },
      {
        q: "Is ArthaFlow free to use?",
        a: "ArthaFlow offers a free Starter plan that includes basic features like product listing, document storage, and limited AI document generation (3 per month). For growing exporters, our Growth and Enterprise plans offer unlimited document generation, priority buyer matching, dedicated support, and more.",
      },
      {
        q: "Can I edit my company information after onboarding?",
        a: "Yes! You can update your company details, contact information, export readiness data, and more at any time from the Settings page. Go to your profile menu in the top-right corner and click on Settings, or navigate directly to /settings.",
      },
    ],
  },
  {
    title: "Export Documentation",
    icon: <FileText size={18} />,
    color: "text-success",
    bg: "bg-green-bg",
    faqs: [
      {
        q: "What is an IEC (Importer Exporter Code)?",
        a: "An IEC is a 10-digit code issued by the Directorate General of Foreign Trade (DGFT), Government of India. It is mandatory for any person or business entity engaged in import or export of goods and services. You can apply for it online at the DGFT website — the process typically takes 3-5 working days.",
      },
      {
        q: "What is an AD Code and why do I need it?",
        a: "An AD (Authorized Dealer) Code is a 14-digit code assigned by your bank to facilitate foreign exchange transactions related to exports. It is mandatory for customs clearance when you ship goods. You can obtain it from any bank branch that handles foreign exchange — just submit your IEC certificate and a request letter.",
      },
      {
        q: "What documents do I need to start exporting?",
        a: "The essential documents include: IEC (Importer Exporter Code), GST registration, AD Code from your bank, a product catalogue with HS codes, and a commercial invoice template. Additional documents like certificates of origin, inspection certificates, or BIS certificates may be required depending on your product and destination country.",
      },
      {
        q: "What are HS Codes and how do I find the right one?",
        a: "HS (Harmonized System) Codes are internationally standardized numerical codes used to classify traded goods. India uses an 8-digit version called ITC-HS. The correct HS code determines your duty rates, eligibility for trade agreements, and regulatory requirements. ArthaFlow's AI can suggest the right HS code for your products based on their description and specifications.",
      },
      {
        q: "Can ArthaFlow generate export documents for me?",
        a: "Yes! Our AI Document Generator can create Product Export Sheets, HS Code Classifications, and Proforma Invoices based on your product data. Simply select a product from your catalogue, choose the document type, and our AI generates a professional, export-ready document in seconds. You can review, edit, and download it as a PDF.",
      },
      {
        q: "What is a Certificate of Origin and when do I need one?",
        a: "A Certificate of Origin (CoO) certifies the country where your goods were manufactured. It's often required by the importing country for customs clearance and to claim preferential duty rates under trade agreements like SAFTA, ASEAN-India FTA, etc. You can obtain it from your local Chamber of Commerce or the Federation of Indian Export Organisations (FIEO).",
      },
    ],
  },
  {
    title: "Buyer Inquiries",
    icon: <Users size={18} />,
    color: "text-artha-gold",
    bg: "bg-gold-bg",
    faqs: [
      {
        q: "How does ArthaFlow help me find buyers?",
        a: "We start with demand, not contacts. ArthaFlow classifies your product to its HS code and then uses official UN Comtrade and World Bank trade data to show which countries import it, in what volume, and whether that demand is growing — so you know which markets are worth pursuing. Direct buyer introductions are being built out with our early customers and are not live yet.",
      },
      {
        q: "Do you have a verified buyer network?",
        a: "Not yet, and we would rather say so than imply otherwise. We are an early-stage company building this with our first pilot manufacturers. What is live today is market intelligence: which countries buy your product, at what value, and who your competition is — all traceable to official trade sources. Buyer verification is on the roadmap and we will describe exactly how it works when it ships.",
      },
      {
        q: "What happens when I click 'I'm Interested' on an inquiry?",
        a: "When you express interest, ArthaFlow confirms mutual interest between you and the buyer. We then facilitate an introduction — sharing basic contact details and product specifications with both parties. Buyer contact details remain private until both sides agree to connect.",
      },
      {
        q: "Can I receive inquiries for products not in my catalogue?",
        a: "Generally, inquiries are matched based on the products listed in your catalogue. The more detailed your product listings (with proper HS codes, specifications, certifications), the better the matching. We recommend keeping your catalogue comprehensive and up to date.",
      },
      {
        q: "What do the inquiry statuses mean?",
        a: "New — A fresh inquiry you haven't responded to yet. Responded — You've expressed interest and ArthaFlow is facilitating the connection. Closed — The inquiry is no longer active, either because you weren't a match or the buyer found another supplier.",
      },
    ],
  },
  {
    title: "Shipping & Logistics",
    icon: <Truck size={18} />,
    color: "text-purple",
    bg: "bg-purple-bg",
    faqs: [
      {
        q: "What are Incoterms and which one should I use?",
        a: "Incoterms (International Commercial Terms) define the responsibilities of buyers and sellers in international trade — who pays for shipping, insurance, customs, and at what point risk transfers. Common ones for Indian exporters: FOB (Free on Board — you deliver to the port, buyer handles shipping), CIF (Cost, Insurance & Freight — you handle everything to the destination port), and EXW (Ex Works — buyer picks up from your factory).",
      },
      {
        q: "How does shipment tracking work on ArthaFlow?",
        a: "Once your shipment is created, you can track its progress through our visual timeline — from order confirmation through document filing, customs clearance, transit, and delivery. Each stage shows the date, status, and relevant details like vessel name and container number.",
      },
      {
        q: "What documents are attached to a shipment?",
        a: "A typical export shipment includes: Bill of Lading (proof of shipment), Commercial Invoice (value declaration), Packing List (contents description), Certificate of Origin (country of manufacture), and any product-specific certificates. ArthaFlow keeps all shipment documents organized in one place.",
      },
      {
        q: "How long does a typical export shipment take?",
        a: "Transit times vary by destination: Middle East (UAE, Saudi) is typically 5-8 days by sea, Southeast Asia 7-12 days, Europe 18-25 days, and the Americas 25-35 days. Add 3-7 days for customs clearance on each end. Air freight is faster but significantly more expensive — typically 2-5 days worldwide.",
      },
    ],
  },
  {
    title: "Payments & Pricing",
    icon: <CreditCard size={18} />,
    color: "text-action-blue",
    bg: "bg-blue-bg",
    faqs: [
      {
        q: "How do I get paid for my exports?",
        a: "International payments typically come through bank wire transfers (SWIFT/TT) directly to your bank account with an AD Code. Common payment terms include: Advance Payment (safest for you), Letter of Credit (LC — bank-guaranteed), and Documents Against Payment (D/P). ArthaFlow helps you understand and negotiate the right payment terms.",
      },
      {
        q: "What currencies can I receive payments in?",
        a: "Indian exporters can receive payments in any freely convertible currency — USD, EUR, GBP, AED, etc. Your bank will convert the foreign currency to INR at the prevailing exchange rate. Some exporters maintain EEFC (Exchange Earners' Foreign Currency) accounts to hold foreign currency and hedge against rate fluctuations.",
      },
      {
        q: "Are there any export incentives I should know about?",
        a: "Yes! The Indian government offers several export incentives: RoDTEP (Remission of Duties and Taxes on Exported Products), MEIS/SEIS (Merchandise/Service Export Incentive Scheme), Duty Drawback, Advance Authorization, and EPCG (Export Promotion Capital Goods). The applicable incentives depend on your product, HS code, and destination country.",
      },
    ],
  },
  {
    title: "Compliance & Security",
    icon: <Shield size={18} />,
    color: "text-success",
    bg: "bg-green-bg",
    faqs: [
      {
        q: "Is my business data secure on ArthaFlow?",
        a: "Absolutely. ArthaFlow uses enterprise-grade security: all data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use Supabase with Row Level Security, meaning each user can only access their own data. We never share your business information with third parties without your explicit consent.",
      },
      {
        q: "What compliance requirements should I be aware of?",
        a: "Key compliance areas for Indian exporters: GST compliance (filing GSTR-1 with export details, LUT for zero-rated supplies), FEMA regulations (for foreign exchange), customs compliance (correct HS codes, valuation), quality standards (BIS, ISO, CE depending on product/market), and sanctions screening (ensuring buyers aren't on restricted lists).",
      },
      {
        q: "Do I need GST registration to export?",
        a: "Yes, GST registration is mandatory for exporters. Exports are treated as zero-rated supplies under GST — you can either export under a Letter of Undertaking (LUT) without paying IGST, or pay IGST and claim a refund. Most exporters prefer the LUT route for better cash flow.",
      },
    ],
  },
  {
    title: "Platform & Account",
    icon: <Settings size={18} />,
    color: "text-text-secondary",
    bg: "bg-subtle",
    faqs: [
      {
        q: "How do I update my company information?",
        a: "Go to the Settings page from the user menu in the top-right corner. You can update your company name, GST number, contact details, export readiness information, and more. Changes are saved instantly.",
      },
      {
        q: "Can I add multiple products to my catalogue?",
        a: "Yes! There's no limit to the number of products you can list. Go to the Products page and click 'Add Product' to add new items. Each product can have its own HS code, specifications, certifications, MOQ, and lead time.",
      },
      {
        q: "How do I delete my account?",
        a: "If you wish to delete your account, please contact us at info@arthaflowglobal.com. We'll process your request within 48 hours and permanently delete all your data from our systems as per our data retention policy.",
      },
      {
        q: "Is ArthaFlow available on mobile?",
        a: "ArthaFlow is fully responsive and works on all mobile devices through your browser. We also offer a mobile-optimized dashboard view at /mobile with a bottom navigation bar, notification cards, and quick actions designed for on-the-go access.",
      },
    ],
  },
];

// ── Accordion item ───────────────────────────────────────────────────────────

function AccordionItem({ q, a }: FAQ) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-subtle last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-background"
      >
        <span className="flex-1 text-sm font-semibold text-text-heading">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-text-muted"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-[13.5px] leading-relaxed text-text-secondary">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Quick links ──────────────────────────────────────────────────────────────

const quickLinks = [
  { label: "Dashboard", href: "/dashboard", icon: <Zap size={16} /> },
  { label: "Products", href: "/products", icon: <Globe size={16} /> },
  { label: "Documents", href: "/documents", icon: <FileText size={16} /> },
  { label: "Settings", href: "/settings", icon: <Settings size={16} /> },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1280px] p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-bg">
            <HelpCircle size={20} className="text-action-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">
              Help Center
            </h1>
            <p className="text-sm text-text-secondary">
              Everything you need to know about exporting with ArthaFlow
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main — FAQ sections */}
        <div className="flex flex-col gap-6">
          {faqSections.map((section, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-subtle px-5 py-4">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${section.bg} ${section.color}`}
                >
                  {section.icon}
                </div>
                <h2 className="text-[15px] font-bold text-text-heading">
                  {section.title}
                </h2>
                <span className="ml-auto text-xs text-text-muted">
                  {section.faqs.length} questions
                </span>
              </div>
              <div>
                {section.faqs.map((faq, i) => (
                  <AccordionItem key={i} {...faq} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Contact card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-1 text-sm font-bold text-text-heading">
              Still need help?
            </h3>
            <p className="mb-4 text-[13px] text-text-secondary">
              Our export specialists are here to assist you with any questions.
            </p>
            <a
              href="mailto:info@arthaflowglobal.com"
              className="flex items-center gap-2.5 rounded-lg bg-background px-4 py-3 text-sm font-medium text-action-blue transition-colors hover:bg-hover-blue"
            >
              <Mail size={16} />
              info@arthaflowglobal.com
            </a>
            <p className="mt-3 text-xs text-text-muted">
              We typically respond within 24 hours on business days.
            </p>
          </div>

          {/* Quick links */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-3.5 text-sm font-bold text-text-heading">
              Quick Links
            </h3>
            <div className="flex flex-col gap-2">
              {quickLinks.map((l, i) => (
                <Link
                  key={i}
                  href={l.href}
                  className="flex items-center gap-2.5 rounded-lg bg-background px-3.5 py-2.5 text-[13px] font-medium text-text-body transition-colors hover:bg-hover-blue"
                >
                  <span className="text-text-muted">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Export readiness tip */}
          <div className="rounded-xl border border-border bg-gradient-to-br from-navy to-royal-blue p-6 shadow-sm">
            <h3 className="mb-1.5 text-sm font-bold text-white">
              💡 Export Tip
            </h3>
            <p className="text-[13px] leading-relaxed text-white/70">
              Complete your IEC registration, add your AD Code, and list at
              least 3 products with HS codes to maximize your Export Readiness
              score and get better buyer matches.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
