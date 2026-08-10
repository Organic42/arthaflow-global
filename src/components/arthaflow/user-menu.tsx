"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, HelpCircle, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setName(p?.full_name || user.user_metadata?.full_name || "Account");
    }
    load();
  }, [supabase]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Hard navigation so the browser sends a fresh request with cleared cookies.
    // A soft router.push can still carry the old session cookie through middleware.
    window.location.href = "/login";
  }

  const initials = name
    ? name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
    : "··";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-action-blue"
      >
        <span className="hidden text-sm font-medium text-white/80 sm:block">
          {name || "Account"}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action-blue text-[13px] font-bold text-white">
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-subtle px-4 py-3">
            <p className="truncate text-sm font-semibold text-text-heading">{name || "Account"}</p>
            {email && <p className="truncate text-xs text-text-muted">{email}</p>}
          </div>
          <div className="p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-body transition-colors hover:bg-background"
            >
              <Settings size={16} className="text-text-muted" />
              Settings
            </Link>
            <Link
              href="/help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-body transition-colors hover:bg-background"
            >
              <HelpCircle size={16} className="text-text-muted" />
              Help
            </Link>
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-error transition-colors hover:bg-red-bg disabled:opacity-60"
            >
              <LogOut size={16} />
              {signingOut ? "Logging out…" : "Logout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
