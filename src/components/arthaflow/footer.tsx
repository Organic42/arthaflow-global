import Link from "next/link";

const productLinks = ["Dashboard", "AI Docs", "Buyer Matching", "Logistics"];
const resourceLinks = [
  { label: "Blog", href: "/blog" },
  { label: "Export Guide", href: "#" },
  { label: "HS Code Lookup", href: "#" },
  { label: "FAQ", href: "#" },
];
const companyLinks = [
  { label: "Contact", href: "mailto:hello@arthaflow.in" },
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
            Your AI-powered export department — without the overhead.
          </p>
          <p className="text-[13px]">hello@arthaflow.in</p>
        </div>

        <div>
          <h4 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-white">
            Product
          </h4>
          {productLinks.map((l) => (
            <a
              key={l}
              className="mb-2.5 block cursor-pointer text-sm text-white/50 hover:text-white/80"
            >
              {l}
            </a>
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
              className="mb-2.5 block text-sm text-white/50 hover:text-white/80"
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
              className="mb-2.5 block text-sm text-white/50 hover:text-white/80"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-5 text-center text-xs text-white/30">
        © 2026 ArthaFlow Global. All rights reserved.
      </div>
    </footer>
  );
}
