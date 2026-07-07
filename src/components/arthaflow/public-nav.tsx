"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/arthaflow/theme-toggle";

const links = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center bg-navy px-8">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-artha-gold"
        >
          ArthaFlow
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="text-sm font-medium text-white/90 hover:text-white"
          >
            Login
          </Link>
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm" className="bg-artha-gold text-navy hover:bg-artha-gold/90">
              Get Started Free
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-16 z-50 flex flex-col gap-3 border-t border-white/10 bg-navy p-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="py-2 text-[15px] text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setMobileOpen(false)}>
            <Button className="w-full bg-artha-gold text-navy hover:bg-artha-gold/90">
              Get Started Free
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
