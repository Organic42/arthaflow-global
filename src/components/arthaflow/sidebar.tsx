"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "/mobile" and "/states" are internal design/QA references (a phone-mockup
// preview and a gallery of empty/error states), not customer features — kept
// reachable by direct URL for the team, deliberately not linked here.
const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/documents", label: "Documents" },
  { href: "/inquiries", label: "Inquiries" },
  { href: "/shipments", label: "Shipments" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col bg-navy shrink-0 md:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-8">
        <Link
          href="/"
          className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-artha-gold via-[#FFE299] to-artha-gold bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,168,67,0.2)]"
        >
          ArthaFlow
        </Link>
      </div>
      
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
        {links.map((l) => {
          const isActive = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}