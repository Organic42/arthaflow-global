"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/arthaflow/theme-toggle";
import { UserMenu } from "@/components/arthaflow/user-menu";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/documents", label: "Documents" },
  { href: "/inquiries", label: "Inquiries" },
  { href: "/shipments", label: "Shipments" },
];

export function DashNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center bg-navy px-8">
      <div className="flex w-full items-center justify-between">
        <Link
          href="/"
          className="shrink-0 text-xl font-extrabold tracking-tight text-artha-gold"
        >
          ArthaFlow
        </Link>

        <div className="ml-12 hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors whitespace-nowrap ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "text-white"
                  : "text-white/65 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
