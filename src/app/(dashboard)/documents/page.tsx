"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/arthaflow/empty-state";
import {
  Search,
  Upload,
  FileText,
  Download,
  Share2,
  Edit,
  Folder,
} from "lucide-react";

const tabs = ["All Documents", "Company Docs", "Product Docs", "Export Docs", "Logistics"];

const docs = [
  { name: "GST Certificate", cat: "Company", date: "15 Mar 2026", status: "Verified", statusClass: "bg-green-bg text-success", actions: ["download"] },
  { name: "Udyam Registration", cat: "Company", date: "15 Mar 2026", status: "Verified", statusClass: "bg-green-bg text-success", actions: ["download"] },
  { name: "CNC Components — Product Sheet", cat: "Export Docs", date: "20 Mar 2026", status: "AI Generated", statusClass: "bg-blue-bg text-action-blue", actions: ["download", "share"] },
  { name: "ISO 9001 Certificate", cat: "Certifications", date: "10 Feb 2026", status: "Verified", statusClass: "bg-green-bg text-success", actions: ["download"] },
  { name: "HS Code Report — 8466.93", cat: "Export Docs", date: "20 Mar 2026", status: "AI Generated", statusClass: "bg-blue-bg text-action-blue", actions: ["download"] },
  { name: "Proforma Invoice — Germany", cat: "Export Docs", date: "22 Mar 2026", status: "Pending Review", statusClass: "bg-gold-bg text-[#92710A]", actions: ["download", "edit"] },
  { name: "Bill of Lading — SH001", cat: "Logistics", date: "25 Mar 2026", status: "Active", statusClass: "bg-purple-bg text-purple", actions: ["download"] },
];

const actionIcons: Record<string, React.ReactNode> = {
  download: <Download size={15} />,
  share: <Share2 size={15} />,
  edit: <Edit size={15} />,
};

export default function DocumentVaultPage() {
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1280px] p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">
          Document Vault
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search documents..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button><Upload size={16} /> Upload Document</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 overflow-x-auto border-b border-border">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`whitespace-nowrap border-b-2 pb-3.5 text-sm font-medium transition-colors ${
              tab === i
                ? "border-action-blue text-action-blue"
                : "border-transparent text-text-secondary hover:text-text-heading"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-background">
              {["Document Name", "Category", "Upload Date", "Status", "Actions"].map((h, i) => (
                <th
                  key={i}
                  className={`border-b border-border px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary ${
                    i === 4 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr
                key={i}
                className="transition-colors hover:bg-background"
              >
                <td className={`px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <FileText size={18} className="text-text-muted" />
                    <span className="text-sm font-medium text-text-heading">{d.name}</span>
                  </div>
                </td>
                <td className={`px-5 py-3.5 text-sm text-text-secondary ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                  {d.cat}
                </td>
                <td className={`px-5 py-3.5 text-sm text-text-secondary ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                  {d.date}
                </td>
                <td className={`px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${d.statusClass}`}>
                    {d.status}
                  </span>
                </td>
                <td className={`px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                  <div className="flex justify-end gap-1.5">
                    {d.actions.map((a, j) => (
                      <button
                        key={j}
                        title={a}
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border bg-card text-text-secondary transition-colors hover:bg-background hover:text-text-heading"
                      >
                        {actionIcons[a]}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState
            icon={<Folder size={40} />}
            title="No documents found"
            description="Try a different search term."
          />
        )}
      </div>

      {/* Pagination */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-text-secondary">
          Showing 1–{filtered.length} of 15 documents
        </span>
        <div className="flex gap-1.5">
          {["<", "1", "2", "3", ">"].map((p, i) => (
            <button
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-md border text-[13px] font-medium ${
                p === "1"
                  ? "border-action-blue bg-action-blue text-white"
                  : "border-border bg-card text-text-body hover:bg-background"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
