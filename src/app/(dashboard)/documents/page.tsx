"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/arthaflow/empty-state";
import { Search, Upload, FileText, Download, Share2, Edit, Folder } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const tabs = ["All Documents", "Company Docs", "Product Docs", "Export Docs", "Logistics"];
const categoryMap: Record<string, string> = {
  company: "Company",
  product: "Product Docs",
  export: "Export Docs",
  logistics: "Logistics",
  certifications: "Certifications",
};

const statusStyles: Record<string, string> = {
  verified: "bg-green-bg text-success",
  ai_generated: "bg-blue-bg text-action-blue",
  pending_review: "bg-gold-bg text-[#92710A]",
  active: "bg-purple-bg text-purple",
};

const statusLabels: Record<string, string> = {
  verified: "Verified",
  ai_generated: "AI Generated",
  pending_review: "Pending Review",
  active: "Active",
};

const actionIcons: Record<string, React.ReactNode> = {
  download: <Download size={15} />,
  share: <Share2 size={15} />,
  edit: <Edit size={15} />,
};

interface Doc {
  id: string;
  name: string;
  category: string;
  status: string;
  file_url: string | null;
  file_size: string | null;
  ai_generated: boolean;
  created_at: string;
}

export default function DocumentVaultPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setDocs(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = docs.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(query.toLowerCase());
    const tabCats: Record<number, string | null> = { 0: null, 1: "company", 2: "product", 3: "export", 4: "logistics" };
    const matchesTab = tab === 0 || d.category === tabCats[tab];
    return matchesSearch && matchesTab;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const handleDownload = async (doc: Doc) => {
    if (!doc.file_url) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">Document Vault</h1>
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
          <Link href="/documents/generate">
            <Button><Upload size={16} /> Generate Document</Button>
          </Link>
        </div>
      </div>

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

      {filtered.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-background">
                {["Document Name", "Category", "Date", "Status", "Actions"].map((h, i) => (
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
                <tr key={d.id} className="transition-colors hover:bg-background">
                  <td className={`px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <FileText size={18} className="text-text-muted" />
                      <span className="text-sm font-medium text-text-heading">{d.name}</span>
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-sm text-text-secondary ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                    {categoryMap[d.category] || d.category}
                  </td>
                  <td className={`px-5 py-3.5 text-sm text-text-secondary ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                    {formatDate(d.created_at)}
                  </td>
                  <td className={`px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusStyles[d.status] || "bg-subtle text-text-secondary"}`}>
                      {statusLabels[d.status] || d.status}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 ${i < filtered.length - 1 ? "border-b border-subtle" : ""}`}>
                    <div className="flex justify-end gap-1.5">
                      {d.file_url && (
                        <button
                          onClick={() => handleDownload(d)}
                          title="Download"
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border bg-card text-text-secondary transition-colors hover:bg-background hover:text-text-heading"
                        >
                          <Download size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={<Folder size={40} />}
            title={query ? "No documents found" : "No documents yet"}
            description={query ? "Try a different search term." : "Generate your first export document with AI or upload company documents."}
            action={query ? undefined : "Generate Documents"}
            onAction={() => window.location.href = "/documents/generate"}
          />
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-text-secondary">
            Showing {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
