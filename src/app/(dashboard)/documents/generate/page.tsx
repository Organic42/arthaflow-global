"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Zap, FileText, Grid3X3, Download } from "lucide-react";

const products = [
  { name: "CNC Precision Components", hs: "8466.93" },
  { name: "Hydraulic Cylinders", hs: "8412.21" },
  { name: "Gear Assemblies", hs: "8483.40" },
];

const docTypes = [
  { name: "Product Export Sheet", desc: "Professional buyer-facing PDF", icon: <FileText size={20} />, bg: "bg-blue-bg", color: "text-action-blue" },
  { name: "HS Code Classification", desc: "8-digit code + duties + regulations", icon: <Grid3X3 size={20} />, bg: "bg-gold-bg", color: "text-[#92710A]" },
  { name: "Proforma Invoice", desc: "Pre-filled template with your details", icon: <FileText size={20} />, bg: "bg-green-bg", color: "text-success" },
];

const specs = [
  ["HS Code", "8466.93.00"],
  ["Material", "Stainless Steel 304"],
  ["Tolerance", "±0.01mm"],
  ["MOQ", "500 units"],
  ["Lead Time", "21 days"],
  ["Certifications", "ISO 9001:2015"],
];

export default function AIDocGeneratorPage() {
  const [selected, setSelected] = useState(0);
  const [state, setState] = useState<"idle" | "generating" | "preview">("preview");

  const generate = () => {
    setState("generating");
    setTimeout(() => setState("preview"), 2200);
  };

  return (
    <div className="mx-auto max-w-[1280px] p-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">
              AI Document Generator
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Select a product and generate export-ready documents in seconds.
            </p>
          </div>

          {/* Product selector */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-3.5 text-base font-bold text-text-heading">Select Product</h2>
            <div className="flex flex-col gap-3">
              {products.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`flex items-center justify-between rounded-[10px] px-4 py-3.5 text-left transition-all ${
                    selected === i
                      ? "border-2 border-action-blue bg-hover-blue"
                      : "border border-border bg-background"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-semibold ${selected === i ? "text-action-blue" : "text-text-heading"}`}>
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-text-secondary">HS Code: {p.hs}</div>
                  </div>
                  {selected === i && <Check size={18} className="text-action-blue" />}
                </button>
              ))}
            </div>
          </div>

          {/* Doc types */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-3.5 text-base font-bold text-text-heading">Generate Documents</h2>
            <div className="mb-5 flex flex-col gap-3">
              {docTypes.map((d, i) => (
                <div key={i} className="flex items-center gap-3.5 rounded-[10px] bg-background px-4 py-3.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${d.bg} ${d.color}`}>
                    {d.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-heading">{d.name}</div>
                    <div className="mt-0.5 text-xs text-text-secondary">{d.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={generate}
              disabled={state === "generating"}
            >
              <Zap size={18} />
              {state === "generating" ? "Generating..." : "Generate All Documents"}
            </Button>
          </div>
        </div>

        {/* RIGHT — Preview */}
        <div className="sticky top-20 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-heading">Document Preview</h2>
          <div className="min-h-[380px] rounded-[10px] bg-background p-5">
            {state === "generating" ? (
              <div className="flex flex-col gap-3.5">
                <Skeleton className="h-3.5 w-[40%]" />
                <Skeleton className="h-5.5 w-[75%]" />
                <Skeleton className="h-3 w-[55%]" />
                <div className="my-1.5 h-px bg-border" />
                {[90, 84, 78, 72, 66, 60].map((w, i) => (
                  <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
                ))}
                <div className="mt-4 flex items-center justify-center gap-2 text-[13px] font-semibold text-action-blue">
                  <span className="inline-block h-3.5 w-3.5 animate-spin-loader rounded-full border-2 border-border border-t-action-blue" />
                  AI is generating your document...
                </div>
              </div>
            ) : (
              <div className="animate-fade-reveal">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-action-blue">
                    PRODUCT EXPORT SHEET
                  </span>
                  <span className="rounded-md bg-green-bg px-2 py-0.5 text-[11px] font-semibold text-success">
                    AI Generated
                  </span>
                </div>
                <div className="text-[17px] font-bold text-text-heading">
                  {products[selected].name}
                </div>
                <div className="mb-3.5 text-xs text-text-secondary">
                  Rajesh Engineering Pvt. Ltd.
                </div>
                <div className="mb-3.5 h-px bg-border" />
                <div className="flex flex-col gap-2.5">
                  {specs.map(([label, value], i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">{label}</span>
                      <span className="text-xs font-semibold text-text-heading">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button disabled={state !== "preview"}>
              <Download size={16} /> Download PDF
            </Button>
            <Button variant="outline" disabled={state !== "preview"}>
              <Download size={16} /> Download Word
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
