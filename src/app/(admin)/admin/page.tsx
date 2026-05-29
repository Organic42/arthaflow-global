"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/arthaflow/progress-bar";
import { ThemeToggle } from "@/components/arthaflow/theme-toggle";
import {
  LayoutGrid,
  Users,
  Inbox,
  Truck,
  Folder,
  BarChart3,
  Settings,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

const navItems = [
  { id: "overview", label: "Overview", icon: <LayoutGrid size={18} /> },
  { id: "manufacturers", label: "Manufacturers", icon: <Users size={18} /> },
  { id: "leads", label: "Buyer Leads", icon: <Inbox size={18} /> },
  { id: "shipments", label: "Shipments", icon: <Truck size={18} /> },
  { id: "documents", label: "Documents", icon: <Folder size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
];

const bottomItems = [
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  { id: "help", label: "Help", icon: <HelpCircle size={18} /> },
];

const stats = [
  { label: "Total Manufacturers", value: "47", delta: "+5 this week", deltaColor: "text-success" },
  { label: "Active Leads", value: "12", delta: "3 new today", deltaColor: "text-action-blue" },
  { label: "Pending Documents", value: "8", delta: "Review needed", deltaColor: "text-artha-gold" },
  { label: "Active Shipments", value: "6", delta: "2 in customs", deltaColor: "text-purple" },
  { label: "Revenue MTD", value: "₹4.2L", delta: "+18% MoM", deltaColor: "text-success" },
];

const tasks = [
  { priority: "Urgent", prioClass: "bg-red-bg text-error", text: "Review IEC docs — Rajesh Engineering", who: "AK", due: "Today" },
  { priority: "High", prioClass: "bg-gold-bg text-[#92710A]", text: "Send buyer inquiry to 3 matched manufacturers", who: "PS", due: "Tomorrow" },
  { priority: "Normal", prioClass: "bg-blue-bg text-action-blue", text: "Generate product sheets for new onboardings", who: "RV", due: "May 31" },
  { priority: "Low", prioClass: "bg-subtle text-text-secondary", text: "Update freight partner rates", who: "AK", due: "Jun 3" },
];

const onboardings = [
  { mfr: "Rajesh Engineering", contact: "Rajesh Patel", city: "Pune", status: "Under Review", statusClass: "bg-gold-bg text-[#92710A]", score: 87, who: "AK" },
  { mfr: "Sterling Castings", contact: "Meena Joshi", city: "Kolhapur", status: "Approved", statusClass: "bg-green-bg text-success", score: 94, who: "PS" },
  { mfr: "Nashik Forgings", contact: "Sunil Kale", city: "Nashik", status: "Needs Info", statusClass: "bg-red-bg text-error", score: 52, who: "RV" },
  { mfr: "Deccan Precision", contact: "Farah Khan", city: "Aurangabad", status: "Pending", statusClass: "bg-subtle text-text-secondary", score: 68, who: "AK" },
];

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-r-lg px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
        active
          ? "border-l-[3px] border-l-action-blue bg-action-blue/15 text-white"
          : "border-l-[3px] border-l-transparent text-white/60 hover:bg-white/5 hover:text-white/85"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function AdminDashboardPage() {
  const [active, setActive] = useState("overview");
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="flex flex-col overflow-x-auto bg-navy p-4 max-lg:flex-row max-lg:items-center lg:p-6">
        <div className="mb-7 flex items-center gap-2 px-2 max-lg:mb-0 max-lg:mr-6">
          <span className="text-xl font-extrabold tracking-tight text-artha-gold">ArthaFlow</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white/70">
            ADMIN
          </span>
        </div>

        <div className="flex flex-col gap-1 max-lg:flex-row max-lg:gap-0">
          {navItems.map((n) => (
            <SidebarItem
              key={n.id}
              icon={n.icon}
              label={n.label}
              active={active === n.id}
              onClick={() => setActive(n.id)}
            />
          ))}
        </div>

        <div className="mx-2 my-4 h-px bg-white/10 max-lg:mx-3 max-lg:my-0 max-lg:h-8 max-lg:w-px" />

        <div className="flex flex-col gap-1 max-lg:flex-row max-lg:gap-0">
          {bottomItems.map((n) => (
            <SidebarItem
              key={n.id}
              icon={n.icon}
              label={n.label}
              active={false}
              onClick={() => {}}
            />
          ))}
        </div>

        <div className="mt-auto pt-4 max-lg:ml-auto max-lg:mt-0 max-lg:pt-0 max-lg:pl-4">
          <div className="mb-3 flex items-center justify-center lg:justify-start">
            <ThemeToggle />
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/10"
          >
            <ArrowRight size={15} /> Manufacturer View
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="overflow-auto bg-background p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-text-heading">
              Operations Dashboard
            </h1>
            <p className="mt-0.5 text-[13px] text-text-secondary">Friday, May 29, 2026</p>
          </div>
          <span className="rounded-md bg-red-bg px-3 py-1.5 text-xs font-semibold text-error">
            3 urgent tasks
          </span>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4.5 shadow-sm">
              <div className="mb-1.5 text-xs text-text-secondary">{s.label}</div>
              <div className="mb-1 text-[28px] font-extrabold tracking-tight text-text-heading">
                {s.value}
              </div>
              <div className={`text-xs font-semibold ${s.deltaColor}`}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-subtle px-6 py-4.5">
            <h2 className="text-base font-bold text-text-heading">Pending Tasks</h2>
          </div>
          {tasks.map((t, i) => (
            <div
              key={i}
              className={`flex items-center gap-3.5 px-6 py-3.5 ${
                i < tasks.length - 1 ? "border-b border-subtle" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => setChecked({ ...checked, [i]: !checked[i] })}
                className="h-4.5 w-4.5 shrink-0 cursor-pointer accent-action-blue"
              />
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.prioClass}`}>
                {t.priority}
              </span>
              <span
                className={`flex-1 text-sm ${
                  checked[i] ? "text-text-muted line-through" : "text-text-body"
                }`}
              >
                {t.text}
              </span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle text-[11px] font-bold text-text-secondary">
                {t.who}
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-text-muted">{t.due}</span>
            </div>
          ))}
        </div>

        {/* Onboardings table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-subtle px-6 py-4.5">
            <h2 className="text-base font-bold text-text-heading">Recent Onboardings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background">
                  {["Manufacturer", "Contact", "City", "Status", "Readiness", "Assigned"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {onboardings.map((o, i) => (
                  <tr key={i} className="border-t border-subtle">
                    <td className="px-6 py-3.5 text-sm font-semibold text-text-heading">{o.mfr}</td>
                    <td className="px-6 py-3.5 text-sm text-text-secondary">{o.contact}</td>
                    <td className="px-6 py-3.5 text-sm text-text-secondary">{o.city}</td>
                    <td className="px-6 py-3.5">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${o.statusClass}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-15">
                          <ProgressBar
                            value={o.score}
                            color={
                              o.score >= 80 ? "bg-success" : o.score >= 60 ? "bg-artha-gold" : "bg-error"
                            }
                          />
                        </div>
                        <span className="text-[13px] font-bold text-text-body">{o.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-subtle text-[11px] font-bold text-text-secondary">
                        {o.who}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
