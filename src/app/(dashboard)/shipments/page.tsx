"use client";

import { useState } from "react";
import { Check, Truck, FileText, Download } from "lucide-react";

const shipments = [
  {
    id: "SH-2024-001", route: "CNC Components → UAE", status: "Customs Cleared", statusClass: "bg-green-bg text-success", eta: "May 30",
    details: { "Shipment Reference": "SH-2024-001", "Product": "CNC Precision Components", "Quantity": "500 units", "Buyer": "Al-Rashid Auto Parts LLC", "Destination": "Jebel Ali, UAE", "Incoterm": "CIF Dubai", "Value": "$11,000 FOB", "Vessel": "MSC Gaia", "Container": "MSCU7234521" },
    timeline: [
      { state: "done", title: "Order Confirmed", date: "May 15, 2026", desc: "Buyer PO received and verified" },
      { state: "done", title: "Documents Filed", date: "May 17, 2026", desc: "Shipping bill, invoice, certificate of origin submitted" },
      { state: "done", title: "Customs Clearance", date: "May 20, 2026", desc: "Indian customs cleared, port release obtained" },
      { state: "current", title: "In Transit", date: "May 21, 2026", desc: "Vessel: MSC Gaia, Container: MSCU7234521" },
      { state: "future", title: "Delivered", date: "ETA: May 30, 2026", desc: "Jebel Ali Port, Dubai" },
    ],
  },
  {
    id: "SH-2024-002", route: "Hydraulic Cylinders → Germany", status: "In Transit", statusClass: "bg-blue-bg text-action-blue", eta: "Jun 5",
    details: { "Shipment Reference": "SH-2024-002", "Product": "Hydraulic Cylinders", "Quantity": "200 units", "Buyer": "Bauer Industrietechnik GmbH", "Destination": "Hamburg, Germany", "Incoterm": "CIF Hamburg", "Value": "$9,400 FOB", "Vessel": "Maersk Sentosa", "Container": "MRKU8841290" },
    timeline: [
      { state: "done", title: "Order Confirmed", date: "May 18, 2026", desc: "Buyer PO received and verified" },
      { state: "done", title: "Documents Filed", date: "May 20, 2026", desc: "Shipping bill, invoice, certificate of origin submitted" },
      { state: "current", title: "Customs Clearance", date: "May 24, 2026", desc: "Awaiting port release at Nhava Sheva" },
      { state: "future", title: "In Transit", date: "ETA: May 27, 2026", desc: "Vessel: Maersk Sentosa" },
      { state: "future", title: "Delivered", date: "ETA: Jun 5, 2026", desc: "Port of Hamburg, Germany" },
    ],
  },
];

const attachedDocs = ["Bill of Lading", "Commercial Invoice", "Packing List"];

function DocDownloadRow({ name }: { name: string }) {
  return (
    <button className="flex w-full items-center gap-2.5 rounded-lg bg-background px-3 py-2.5 text-left transition-colors hover:bg-hover-blue">
      <FileText size={16} className="text-text-muted" />
      <span className="flex-1 text-[13px] font-medium text-text-body">{name}</span>
      <Download size={15} className="text-action-blue" />
    </button>
  );
}

export default function ShipmentTrackerPage() {
  const [sel, setSel] = useState(0);
  const cur = shipments[sel];

  return (
    <div className="mx-auto max-w-[1280px] p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">Shipments</h1>
        <span className="rounded-md bg-green-bg px-2 py-0.5 text-[11px] font-semibold text-success">
          2 Active
        </span>
      </div>

      {/* Shipment selector cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shipments.map((s, i) => (
          <button
            key={i}
            onClick={() => setSel(i)}
            className={`flex items-center gap-4 rounded-xl border bg-card p-6 text-left shadow-sm transition-all ${
              sel === i ? "border-2 border-action-blue" : "border-border hover:shadow-md"
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-bg text-action-blue">
              <Truck size={22} />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-text-muted">{s.id}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.statusClass}`}>
                  {s.status}
                </span>
              </div>
              <div className="mb-0.5 text-[15px] font-bold text-text-heading">{s.route}</div>
              <div className="text-[13px] text-text-secondary">ETA: {s.eta}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail area */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Timeline */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-base font-bold text-text-heading">
            Shipment Timeline — {cur.id}
          </h2>
          <div>
            {cur.timeline.map((t, i) => {
              const isLast = i === cur.timeline.length - 1;
              return (
                <div key={i} className="flex gap-4">
                  {/* Circle + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${
                        t.state === "done"
                          ? "bg-success text-white"
                          : t.state === "current"
                            ? "animate-pulse-ring bg-action-blue text-white"
                            : "border-2 border-border bg-card"
                      }`}
                    >
                      {t.state === "done" && <Check size={14} />}
                      {t.state === "current" && <span className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    {!isLast && (
                      <div
                        className={`min-h-[36px] flex-1 ${
                          t.state === "future"
                            ? "border-l-2 border-dashed border-border"
                            : t.state === "done"
                              ? "w-0.5 bg-success"
                              : "w-0.5 bg-border"
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className={isLast ? "" : "pb-6"}>
                    <div className={`text-[15px] font-semibold ${t.state === "future" ? "text-text-muted" : "text-text-heading"}`}>
                      {t.title}
                    </div>
                    <div className={`mt-0.5 mb-1 text-[13px] font-medium ${t.state === "current" ? "text-action-blue" : "text-text-secondary"}`}>
                      {t.date}
                    </div>
                    <div className="text-[13px] text-text-secondary">{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar: Details + Docs */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-text-heading">Shipment Details</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(cur.details).map(([k, v], i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="shrink-0 text-[13px] text-text-secondary">{k}</span>
                  <span className={`text-right text-[13px] font-semibold text-text-heading ${
                    ["Container", "Vessel"].includes(k) ? "font-mono" : ""
                  }`}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-3.5 text-sm font-bold text-text-heading">Attached Documents</h3>
            <div className="flex flex-col gap-2">
              {attachedDocs.map((d, i) => (
                <DocDownloadRow key={i} name={d} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
