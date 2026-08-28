import Link from "next/link";
import Image from "next/image";

// RIIDL pre-incubation agreement, clause 8.1: their and SVV's logo "should be
// added on your official website" once shared. Both source files are
// transparent PNGs on dark ink (black/maroon), so they render inside a white
// pill rather than directly on the navy footer — on navy the RIIDL wordmark
// in particular would be nearly unreadable.
const supporters = [
  { name: "RIIDL", logo: "/riidl-logo.png", width: 84, height: 40 },
  { name: "Somaiya Vidyavihar University", logo: "/svu-logo.png", width: 40, height: 42 },
];

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "AI Docs", href: "/documents/generate" },
  { label: "Buyer Matching", href: "/inquiries" },
  { label: "Logistics", href: "/shipments" },
];
const resourceLinks = [
  { label: "Export Toolkit", href: "/tools" },
  { label: "What's Growing", href: "/export/growing" },
  { label: "Landed Cost Calculator", href: "/calculator" },
  { label: "HSN Code Search", href: "/hsn-search" },
  { label: "Blog", href: "/blog" },
  // "Export Guide" pointed at "#" and was removed rather than left promising a
  // page that doesn't exist.
  { label: "FAQ", href: "/pricing#faq" },
];
const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "mailto:info@arthaflowglobal.com" },
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-navy px-8 pb-6 pt-12 text-white/60">
      <div className="mx-auto mb-10 grid max-w-[1200px] grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 text-xl font-extrabold text-artha-gold">
            ArthaFlow
          </div>
          <p className="mb-3 max-w-[240px] text-[13px] leading-relaxed">
            Your export department — without the overhead.
          </p>
          <p className="text-[13px]">info@arthaflowglobal.com</p>
        </div>

        <div>
          <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">
            Product
          </h4>
          {productLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="mb-2.5 block text-sm text-white/70 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div>
          <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">
            Resources
          </h4>
          {resourceLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="mb-2.5 block text-sm text-white/70 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div>
          <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">
            Company
          </h4>
          {companyLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="mb-2.5 block text-sm text-white/70 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto mb-6 flex max-w-[1200px] flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-[26px]">
        <span className="font-heading text-2xl font-extrabold tracking-tight text-artha-gold sm:text-[2rem]">
          Supported by
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {supporters.map((s) => (
            <div
              key={s.name}
              className="flex h-11 items-center rounded-md bg-white px-4 shadow-sm transition hover:shadow-md"
            >
              <Image
                src={s.logo}
                alt={s.name}
                width={s.width}
                height={s.height}
                className="w-auto object-contain"
                style={{ height: s.height }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-5 text-center text-xs text-white/55">
        © 2026 ArthaFlow Global. All rights reserved.
      </div>
    </footer>
  );
}
