"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

const products = [
  { name: "CNC Precision Components", hs: "8466.93", moq: "500 units", lead: "21 days", status: "Export Ready", statusClass: "bg-green-bg text-success" },
  { name: "Hydraulic Cylinders", hs: "8412.21", moq: "200 units", lead: "28 days", status: "Export Ready", statusClass: "bg-green-bg text-success" },
  { name: "Gear Assemblies", hs: "8483.40", moq: "1,000 units", lead: "35 days", status: "Export Ready", statusClass: "bg-green-bg text-success" },
  { name: "Bearing Housings", hs: "8483.30", moq: "750 units", lead: "24 days", status: "Incomplete", statusClass: "bg-gold-bg text-[#92710A]" },
  { name: "Shaft Couplings", hs: "8483.60", moq: "600 units", lead: "18 days", status: "Export Ready", statusClass: "bg-green-bg text-success" },
  { name: "Flange Adapters", hs: "7307.91", moq: "400 units", lead: "20 days", status: "Incomplete", statusClass: "bg-gold-bg text-[#92710A]" },
];

function ProductCard({ name, hs, moq, lead, status, statusClass }: typeof products[0]) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-[3px] hover:shadow-md">
      <div className="relative flex h-40 items-center justify-center bg-subtle text-text-muted">
        <Package size={48} />
        <span className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
          {status}
        </span>
      </div>
      <div className="p-5">
        <h3 className="mb-1 text-[15px] font-bold text-text-heading">{name}</h3>
        <div className="mb-3.5 font-mono text-xs text-text-secondary">HS Code: {hs}</div>
        <div className="mb-4 flex gap-5">
          <div>
            <div className="text-[11px] text-text-muted">MOQ</div>
            <div className="text-[13px] font-semibold text-text-body">{moq}</div>
          </div>
          <div>
            <div className="text-[11px] text-text-muted">Lead Time</div>
            <div className="text-[13px] font-semibold text-text-body">{lead}</div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-subtle pt-3.5">
          <Link href="/documents/generate" className="text-[13px] font-semibold text-action-blue hover:underline">
            Generate Docs
          </Link>
          <button className="text-[13px] font-medium text-text-secondary hover:text-text-heading">
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductCataloguePage() {
  return (
    <div className="mx-auto max-w-[1280px] p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">Products</h1>
        <Button><Plus size={16} /> Add Product</Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => (
          <ProductCard key={i} {...p} />
        ))}
        <button className="flex min-h-[320px] flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border text-text-muted transition-colors hover:border-action-blue hover:text-action-blue">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
            <Plus size={22} />
          </div>
          <span className="text-sm font-semibold">Add Product</span>
        </button>
      </div>
    </div>
  );
}
