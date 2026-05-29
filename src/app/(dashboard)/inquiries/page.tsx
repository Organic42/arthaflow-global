"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, Shield } from "lucide-react";

const inquiries = [
  { flag: "\u{1F1E9}\u{1F1EA}", country: "Germany", time: "2 hours ago", product: "CNC Precision Components", sub: "500 units, monthly recurring", status: "New", statusColor: "text-action-blue", priority: "High Priority", hs: "8466.93", qty: "500 units/month", delivery: "CIF Hamburg", timeline: "First shipment within 45 days", certs: "ISO 9001, CE Mark", budget: "$15–22 per unit", sector: "Automotive sector", since: "Active since 2019" },
  { flag: "\u{1F1E6}\u{1F1EA}", country: "UAE", time: "1 day ago", product: "Hydraulic Cylinders", sub: "200 units, one-time", status: "New", statusColor: "text-action-blue", priority: "Medium Priority", hs: "8412.21", qty: "200 units", delivery: "CIF Jebel Ali", timeline: "Within 30 days", certs: "ISO 9001", budget: "$40–55 per unit", sector: "Oil & Gas equipment", since: "Active since 2021" },
  { flag: "\u{1F1FA}\u{1F1F8}", country: "USA", time: "3 days ago", product: "Gear Assemblies", sub: "1,000 units, quarterly", status: "Responded", statusColor: "text-success", priority: "High Priority", hs: "8483.40", qty: "1,000 units/quarter", delivery: "FOB Nhava Sheva", timeline: "Rolling quarterly", certs: "ISO 9001, AGMA", budget: "$8–12 per unit", sector: "Industrial machinery", since: "Active since 2017" },
  { flag: "\u{1F1EC}\u{1F1E7}", country: "UK", time: "5 days ago", product: "CNC Precision Components", sub: "300 units, recurring", status: "Closed", statusColor: "text-text-muted", priority: "Low Priority", hs: "8466.93", qty: "300 units/month", delivery: "CIF Felixstowe", timeline: "Ongoing", certs: "ISO 9001", budget: "$16–20 per unit", sector: "Aerospace components", since: "Active since 2015" },
];

const filterTabs = ["All", "New", "Responded", "Closed"];

export default function BuyerInquiriesPage() {
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState(0);
  const [interested, setInterested] = useState<Record<number, boolean>>({});

  const visible = inquiries.filter((q) => tab === 0 || q.status === filterTabs[tab]);
  const cur = inquiries[sel];

  const reqFields = [
    ["Product", `${cur.product} (HS ${cur.hs})`],
    ["Quantity", cur.qty],
    ["Delivery", cur.delivery],
    ["Timeline", cur.timeline],
    ["Certifications Required", cur.certs],
    ["Budget Range", cur.budget],
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* LEFT — list */}
        <div className="border-r border-border bg-card">
          <div className="px-6 pt-6">
            <div className="mb-4.5 flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-text-heading">Buyer Inquiries</h1>
              <span className="rounded-md bg-blue-bg px-2 py-0.5 text-[11px] font-semibold text-action-blue">
                3 New
              </span>
            </div>
            <div className="flex gap-4 border-b border-border">
              {filterTabs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className={`border-b-2 pb-3 text-[13px] font-medium transition-colors ${
                    tab === i
                      ? "border-action-blue text-action-blue"
                      : "border-transparent text-text-secondary hover:text-text-heading"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            {visible.map((q) => {
              const realIdx = inquiries.indexOf(q);
              const active = sel === realIdx;
              return (
                <button
                  key={realIdx}
                  onClick={() => setSel(realIdx)}
                  className={`block w-full border-b border-subtle px-6 py-4 text-left transition-all ${
                    active
                      ? "border-l-[3px] border-l-action-blue bg-hover-blue"
                      : "border-l-[3px] border-l-transparent hover:bg-background"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-text-body">
                      <span className="text-[15px]">{q.flag}</span>
                      {q.country}
                    </span>
                    <span className="text-[11px] text-text-muted">{q.time}</span>
                  </div>
                  <div className="mb-0.5 text-sm font-semibold text-text-heading">{q.product}</div>
                  <div className="mb-2 text-[13px] text-text-secondary">{q.sub}</div>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${q.statusColor}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {q.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — detail */}
        <div className="bg-background p-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {/* Badges */}
            <div className="mb-4 flex gap-2">
              <span className="rounded-md bg-blue-bg px-2 py-0.5 text-[11px] font-semibold text-action-blue">New Inquiry</span>
              <span className="rounded-md bg-gold-bg px-2 py-0.5 text-[11px] font-semibold text-[#92710A]">{cur.priority}</span>
            </div>

            <h2 className="mb-4 text-[22px] font-extrabold tracking-tight text-text-heading">
              {cur.product} — {cur.country}
            </h2>

            {/* Buyer tags */}
            <div className="mb-5 flex flex-wrap gap-2">
              {[`Verified ${cur.country} Buyer`, cur.sector, cur.since].map((b, i) => (
                <span key={i} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary">
                  {b}
                </span>
              ))}
            </div>

            <div className="mb-5 h-px bg-border" />

            {/* Requirements */}
            <h3 className="mb-3.5 text-sm font-bold text-text-heading">Requirements</h3>
            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {reqFields.map(([label, value], i) => (
                <div key={i}>
                  <div className="mb-0.5 text-xs text-text-secondary">{label}</div>
                  <div className="text-sm font-semibold text-text-heading">{value}</div>
                </div>
              ))}
            </div>

            <div className="mb-5 h-px bg-border" />

            {/* Actions */}
            <div className="mb-4 flex flex-wrap gap-3">
              <Button
                onClick={() => setInterested({ ...interested, [sel]: true })}
                variant={interested[sel] ? "outline" : "default"}
              >
                {interested[sel] && <Check size={16} />}
                {interested[sel] ? "Interest Confirmed" : "I'm Interested"}
              </Button>
              <Button variant="outline">Not a Match</Button>
              <Button variant="ghost" className="text-action-blue">
                <HelpCircle size={16} />
                Ask ArthaFlow
              </Button>
            </div>

            {/* Privacy notice */}
            <div className="flex items-start gap-2 rounded-lg bg-gold-bg px-3.5 py-3 text-[13px] text-[#92710A]">
              <Shield size={16} className="mt-0.5 shrink-0" />
              ArthaFlow will connect you with the buyer after confirming mutual interest. Buyer contact details stay private until both sides agree.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
