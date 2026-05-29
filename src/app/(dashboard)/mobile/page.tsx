"use client";

import { useState, useEffect } from "react";
import { Home, Package, Folder, User, Menu, ChevronRight } from "lucide-react";

const stats = [
  { label: "Readiness", value: "92", color: "text-action-blue" },
  { label: "Inquiries", value: "3", color: "text-artha-gold" },
  { label: "Documents", value: "12", color: "text-success" },
  { label: "Shipments", value: "2", color: "text-purple" },
];

const notifs = [
  { border: "border-l-success", title: "New Inquiry!", sub: "Auto parts — Germany", href: "/inquiries" },
  { border: "border-l-artha-gold", title: "Docs Ready", sub: "Product sheet generated", href: "/documents" },
  { border: "border-l-purple", title: "Shipment Update", sub: "Customs cleared — UAE", href: "/shipments" },
];

const quickActions = ["Generate Docs", "Upload", "HS Codes", "Support"];

const bottomNav = [
  { id: "home", label: "Home", icon: <Home size={22} /> },
  { id: "products", label: "Products", icon: <Package size={22} /> },
  { id: "docs", label: "Docs", icon: <Folder size={22} /> },
  { id: "profile", label: "Profile", icon: <User size={22} /> },
];

export default function MobileDashboardPage() {
  const [navTab, setNavTab] = useState("home");
  const score = 92;
  const R = 34;
  const C = 2 * Math.PI * R;
  const [dash, setDash] = useState(C);

  useEffect(() => {
    const t = setTimeout(() => setDash(C * (1 - score / 100)), 200);
    return () => clearTimeout(t);
  }, [C]);

  return (
    <div className="flex min-h-screen justify-center bg-background">
      <div className="relative min-h-screen w-[390px] max-w-full bg-card shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        {/* Header (navy with rounded bottom) */}
        <div className="rounded-b-3xl bg-navy pb-7">
          {/* Top bar */}
          <div className="flex h-14 items-center justify-between px-4">
            <span className="text-[19px] font-extrabold text-artha-gold">ArthaFlow</span>
            <button className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-white/10 text-white">
              <Menu size={20} />
            </button>
          </div>

          {/* Welcome + score ring */}
          <div className="flex items-center justify-between px-5 pt-2">
            <div>
              <div className="text-[19px] font-bold text-white">Good morning, Rajesh</div>
              <div className="mt-0.5 text-[13px] text-white/60">Export Readiness</div>
            </div>
            <div className="relative h-[84px] w-[84px]">
              <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="42" cy="42" r={R} fill="none" stroke="#163A6E" strokeWidth="7" />
                <circle
                  cx="42" cy="42" r={R} fill="none"
                  stroke="#2563EB" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={dash}
                  style={{ transition: "stroke-dashoffset 800ms ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[26px] font-extrabold text-white">
                {score}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-24 pt-5">
          {/* Stats 2x2 */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3.5">
                <div className={`text-2xl font-extrabold tracking-tight ${s.color}`}>{s.value}</div>
                <div className="mt-0.5 text-[11px] text-text-secondary">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Notification cards */}
          <div className="mb-5 flex flex-col gap-2.5">
            {notifs.map((n, i) => (
              <a
                key={i}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl border border-border ${n.border} border-l-[3px] bg-card p-3.5`}
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-text-heading">{n.title}</div>
                  <div className="mt-0.5 text-[13px] text-text-secondary">{n.sub}</div>
                </div>
                <ChevronRight size={18} className="text-action-blue" />
              </a>
            ))}
          </div>

          {/* Quick actions horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((q, i) => (
              <button
                key={i}
                className="shrink-0 rounded-full border border-border bg-background px-4.5 py-2.5 text-[13px] font-medium text-text-body"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 flex h-16 items-center justify-around rounded-t-2xl border-t border-border bg-card">
          {bottomNav.map((b) => (
            <button
              key={b.id}
              onClick={() => setNavTab(b.id)}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 p-1 ${
                navTab === b.id ? "text-action-blue" : "text-text-muted"
              }`}
            >
              {b.icon}
              <span className={`text-[11px] ${navTab === b.id ? "font-semibold" : "font-medium"}`}>
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
