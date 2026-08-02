"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/arthaflow/theme-toggle";
import { UserMenu } from "@/components/arthaflow/user-menu";
import { Menu, X } from "lucide-react";

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

export function DashNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu automatically if the screen size increases
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setIsOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 md:px-8 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        
        {/* Mobile Left Side: Logo */}
        <div className="flex items-center md:hidden">
          <Link href="/" className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-artha-gold via-[#FFE299] to-artha-gold bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,168,67,0.2)]">
            ArthaFlow
          </Link>
        </div>

        {/* Right Side: Theme, User Profile, & Mobile Hamburger */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <UserMenu />
          <button 
            onClick={() => setIsOpen(true)} 
            className="text-foreground p-1 md:hidden"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Out Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Dark transparent backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* The Navy Sidebar Panel */}
          <div className="relative w-64 bg-navy h-full shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-200 ml-auto">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
              <span className="text-xl font-extrabold text-artha-gold">Menu</span>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
              {links.map((l) => {
                const isActive = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setIsOpen(false)}
                    className={`rounded-md px-4 py-3 text-sm font-medium transition-colors ${
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
          </div>
        </div>
      )}
    </>
  );
}