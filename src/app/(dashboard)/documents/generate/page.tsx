"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Zap,
  FileText,
  Grid3X3,
  Download,
  Package,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  hs_code: string | null;
  description: string | null;
  moq: string | null;
  lead_time: string | null;
}

interface KvRow {
  label: string;
  value: string;
}
interface DocSection {
  heading: string;
  type: "kv" | "text" | "list";
  rows?: KvRow[];
  body?: string;
  items?: string[];
}
interface DocContent {
  title: string;
  subtitle?: string;
  reference?: string;
  sections: DocSection[];
  footer?: string;
}

type DocTypeId = "product_export_sheet" | "hs_classification" | "proforma_invoice";

const docTypes: {
  id: DocTypeId;
  name: string;
  desc: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
}[] = [
  {
    id: "product_export_sheet",
    name: "Product Export Sheet",
    desc: "Professional buyer-facing document",
    icon: <FileText size={20} />,
    bg: "bg-blue-bg",
    color: "text-action-blue",
  },
  {
    id: "hs_classification",
    name: "HS Code Classification",
    desc: "8-digit ITC-HS code + duties + compliance",
    icon: <Grid3X3 size={20} />,
    bg: "bg-gold-bg",
    color: "text-[#92710A]",
  },
  {
    id: "proforma_invoice",
    name: "Proforma Invoice",
    desc: "Pre-filled template with your details",
    icon: <FileText size={20} />,
    bg: "bg-green-bg",
    color: "text-success",
  },
];

const docLabels: Record<DocTypeId, string> = {
  product_export_sheet: "PRODUCT EXPORT SHEET",
  hs_classification: "HS CODE CLASSIFICATION",
  proforma_invoice: "PROFORMA INVOICE",
};

/**
 * Escapes text before it goes into printDocument()'s HTML string.
 *
 * Everything printDocument() interpolates — title, sections, row values — is
 * LLM output ultimately grounded in user-editable Product/Settings fields
 * (the system prompt asks the model to echo them back). The on-page preview
 * is safe because it goes through JSX, which auto-escapes; this popup window
 * is built with a raw template string + document.write(), so without this it
 * is a real HTML/script injection sink, not a theoretical one — and this doc
 * type is explicitly meant to be downloaded and sent to an external buyer.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Section renderer (shared by preview + print) ─────────────────────────────

function SectionView({ section }: { section: DocSection }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-text-muted">
        {section.heading}
      </div>
      {section.type === "kv" && (
        <div className="flex flex-col gap-2">
          {section.rows?.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <span className="text-xs font-medium text-text-secondary">{r.label}</span>
              <span className="text-right text-xs font-semibold text-text-heading">
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {section.type === "text" && (
        <p className="text-[13px] leading-relaxed text-text-body">{section.body}</p>
      )}
      {section.type === "list" && (
        <ul className="flex list-disc flex-col gap-1.5 pl-4">
          {section.items?.map((item, i) => (
            <li key={i} className="text-[13px] leading-snug text-text-body">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AIDocGeneratorPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  // Per-doc-type state: idle | generating | done | error
  const [docStates, setDocStates] = useState<
    Record<DocTypeId, "idle" | "generating" | "done" | "error">
  >({
    product_export_sheet: "idle",
    hs_classification: "idle",
    proforma_invoice: "idle",
  });
  const [generated, setGenerated] = useState<Partial<Record<DocTypeId, DocContent>>>({});
  const [previewType, setPreviewType] = useState<DocTypeId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("id, name, hs_code, description, moq, lead_time")
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setProducts(data ?? []);
        if (data?.length) setSelected(data[0].id);
        setLoadingProducts(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset generation state when switching products
  function selectProduct(id: string) {
    setSelected(id);
    setDocStates({
      product_export_sheet: "idle",
      hs_classification: "idle",
      proforma_invoice: "idle",
    });
    setGenerated({});
    setPreviewType(null);
    setError(null);
  }

  async function generateOne(docType: DocTypeId): Promise<boolean> {
    if (!selected) return false;
    setDocStates((s) => ({ ...s, [docType]: "generating" }));
    setError(null);
    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selected, docType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setGenerated((g) => ({ ...g, [docType]: data.document.content as DocContent }));
      setDocStates((s) => ({ ...s, [docType]: "done" }));
      setPreviewType(docType);
      return true;
    } catch (e) {
      setDocStates((s) => ({ ...s, [docType]: "error" }));
      setError(e instanceof Error ? e.message : "Generation failed");
      return false;
    }
  }

  async function generateAll() {
    for (const d of docTypes) {
      if (docStates[d.id] !== "done") {
        const ok = await generateOne(d.id);
        if (!ok) break; // stop the chain on first failure
      }
    }
  }

  function printDocument() {
    if (!previewType || !generated[previewType] || !printRef.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const doc = generated[previewType]!;
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(doc.title)}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#1a2433;max-width:720px;margin:40px auto;padding:0 24px}
        .lbl{font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#2563EB}
        h1{font-size:22px;margin:6px 0 2px}
        .sub{font-size:13px;color:#5A6678;margin-bottom:4px}
        .ref{font-size:11px;color:#8A93A3;margin-bottom:18px}
        hr{border:none;border-top:1px solid #E3E8EF;margin:14px 0}
        h2{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8A93A3;margin:18px 0 8px}
        table{width:100%;border-collapse:collapse}
        td{font-size:13px;padding:4px 0;vertical-align:top}
        td.l{color:#5A6678;width:40%}
        td.v{font-weight:600;text-align:right}
        p{font-size:13px;line-height:1.6}
        li{font-size:13px;line-height:1.6;margin-bottom:4px}
        .footer{margin-top:28px;font-size:11px;color:#8A93A3;border-top:1px solid #E3E8EF;padding-top:12px}
      </style></head><body>
      <div class="lbl">${escapeHtml(docLabels[previewType])}</div>
      <h1>${escapeHtml(doc.title)}</h1>
      ${doc.subtitle ? `<div class="sub">${escapeHtml(doc.subtitle)}</div>` : ""}
      ${doc.reference ? `<div class="ref">Ref: ${escapeHtml(doc.reference)}</div>` : ""}
      <hr/>
      ${doc.sections
        .map((s) => {
          let inner = "";
          if (s.type === "kv")
            inner = `<table>${(s.rows ?? [])
              .map(
                (r) =>
                  `<tr><td class="l">${escapeHtml(r.label)}</td><td class="v">${escapeHtml(r.value)}</td></tr>`
              )
              .join("")}</table>`;
          if (s.type === "text") inner = `<p>${escapeHtml(s.body ?? "")}</p>`;
          if (s.type === "list")
            inner = `<ul>${(s.items ?? []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
          return `<h2>${escapeHtml(s.heading)}</h2>${inner}`;
        })
        .join("")}
      ${doc.footer ? `<div class="footer">${escapeHtml(doc.footer)} · Generated by ArthaFlow Global</div>` : ""}
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  const anyGenerating = Object.values(docStates).includes("generating");
  const previewDoc = previewType ? generated[previewType] : null;

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

          {/* Product selector — real data */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-3.5 text-base font-bold text-text-heading">Select Product</h2>
            {loadingProducts ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[62px] w-full rounded-[10px]" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-border bg-background py-10 text-center">
                <Package size={32} className="text-text-muted" />
                <p className="text-sm text-text-secondary">
                  No products yet. Add a product first.
                </p>
                <Link href="/products">
                  <Button size="sm">Add Product</Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p.id)}
                    className={`flex items-center justify-between rounded-[10px] px-4 py-3.5 text-left transition-all ${
                      selected === p.id
                        ? "border-2 border-action-blue bg-hover-blue"
                        : "border border-border bg-background"
                    }`}
                  >
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          selected === p.id ? "text-action-blue" : "text-text-heading"
                        }`}
                      >
                        {p.name}
                      </div>
                      <div className="mt-0.5 text-xs text-text-secondary">
                        {p.hs_code ? `HS Code: ${p.hs_code}` : "No HS code yet — AI will classify"}
                      </div>
                    </div>
                    {selected === p.id && <Check size={18} className="text-action-blue" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Doc types — per-document generate */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-3.5 text-base font-bold text-text-heading">Generate Documents</h2>
            <div className="mb-5 flex flex-col gap-3">
              {docTypes.map((d) => {
                const st = docStates[d.id];
                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3.5 rounded-[10px] px-4 py-3.5 transition-colors ${
                      previewType === d.id ? "bg-hover-blue" : "bg-background"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${d.bg} ${d.color}`}
                    >
                      {d.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-text-heading">{d.name}</div>
                      <div className="mt-0.5 truncate text-xs text-text-secondary">{d.desc}</div>
                    </div>
                    {st === "done" ? (
                      <button
                        onClick={() => setPreviewType(d.id)}
                        className="flex shrink-0 items-center gap-1.5 rounded-md bg-green-bg px-2.5 py-1.5 text-xs font-semibold text-success"
                      >
                        <Check size={13} /> View
                      </button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={!selected || anyGenerating}
                        onClick={() => generateOne(d.id)}
                      >
                        {st === "generating" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : st === "error" ? (
                          "Retry"
                        ) : (
                          "Generate"
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-error/30 bg-red-bg px-3 py-2.5 text-[13px] text-error">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={generateAll}
              disabled={!selected || anyGenerating || products.length === 0}
            >
              <Zap size={18} />
              {anyGenerating ? "Generating..." : "Generate All Documents"}
            </Button>
          </div>
        </div>

        {/* RIGHT — Preview */}
        <div className="sticky top-20 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-text-heading">Document Preview</h2>
          <div ref={printRef} className="min-h-[380px] max-h-[560px] overflow-y-auto rounded-[10px] bg-background p-5">
            {anyGenerating && !previewDoc ? (
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
            ) : previewDoc && previewType ? (
              <div className="animate-fade-reveal">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-action-blue">
                    {docLabels[previewType]}
                  </span>
                  <span className="rounded-md bg-green-bg px-2 py-0.5 text-[11px] font-semibold text-success">
                    AI Generated
                  </span>
                </div>
                <div className="text-[17px] font-bold text-text-heading">{previewDoc.title}</div>
                {previewDoc.subtitle && (
                  <div className="text-xs text-text-secondary">{previewDoc.subtitle}</div>
                )}
                {previewDoc.reference && (
                  <div className="mt-0.5 font-mono text-[11px] text-text-muted">
                    Ref: {previewDoc.reference}
                  </div>
                )}
                <div className="my-3.5 h-px bg-border" />
                {previewDoc.sections.map((s, i) => (
                  <SectionView key={i} section={s} />
                ))}
                {previewDoc.footer && (
                  <div className="mt-4 border-t border-border pt-3 text-[11px] text-text-muted">
                    {previewDoc.footer}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[340px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-bg text-action-blue">
                  <Zap size={22} />
                </div>
                <p className="max-w-[240px] text-sm text-text-secondary">
                  Select a product and generate a document to see the preview here.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button disabled={!previewDoc} onClick={printDocument}>
              <Download size={16} /> Download PDF
            </Button>
            <Link href="/documents" className={!previewDoc ? "pointer-events-none" : ""}>
              <Button variant="outline" className="w-full" disabled={!previewDoc}>
                <FileText size={16} /> View in Vault
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
