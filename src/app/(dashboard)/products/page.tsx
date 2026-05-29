"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StaggerGrid, StaggerItem } from "@/components/arthaflow/stagger";

interface Product {
  id: string;
  name: string;
  hs_code: string | null;
  moq: string | null;
  lead_time: string | null;
  status: string;
  certifications: string[];
  production_capacity: string | null;
  description: string | null;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  export_ready: { label: "Export Ready", cls: "bg-green-bg text-success" },
  incomplete: { label: "Incomplete", cls: "bg-gold-bg text-[#92710A]" },
  draft: { label: "Draft", cls: "bg-subtle text-text-secondary" },
};

function ProductCard({ product, onRefresh }: { product: Product; onRefresh: () => void }) {
  const s = statusMap[product.status] || statusMap.draft;
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-[3px] hover:shadow-md">
      <div className="relative flex h-40 items-center justify-center bg-subtle text-text-muted">
        <Package size={48} />
        <span className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
          {s.label}
        </span>
      </div>
      <div className="p-5">
        <h3 className="mb-1 text-[15px] font-bold text-text-heading">{product.name}</h3>
        {product.hs_code && (
          <div className="mb-3.5 font-mono text-xs text-text-secondary">HS Code: {product.hs_code}</div>
        )}
        <div className="mb-4 flex gap-5">
          <div>
            <div className="text-[11px] text-text-muted">MOQ</div>
            <div className="text-[13px] font-semibold text-text-body">{product.moq || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-text-muted">Lead Time</div>
            <div className="text-[13px] font-semibold text-text-body">{product.lead_time || "—"}</div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-subtle pt-3.5">
          <Link href="/documents/generate" className="text-[13px] font-semibold text-action-blue hover:underline">
            Generate Docs
          </Link>
          <button className="text-[13px] font-medium text-text-secondary hover:text-text-heading">Edit</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductCataloguePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New product form
  const [newName, setNewName] = useState("");
  const [newHs, setNewHs] = useState("");
  const [newMoq, setNewMoq] = useState("");
  const [newLead, setNewLead] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCert, setNewCert] = useState("");

  const loadProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleAdd = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newName.trim()) return;
    setSaving(true);

    await supabase.from("products").insert({
      user_id: user.id,
      name: newName,
      hs_code: newHs || null,
      moq: newMoq || null,
      lead_time: newLead || null,
      production_capacity: newCapacity || null,
      description: newDesc || null,
      certifications: newCert ? [newCert] : [],
      status: newHs && newMoq && newLead ? "export_ready" : "incomplete",
    });

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: user.id,
      badge: "New",
      badge_color: "blue",
      text: `Product added — ${newName}`,
      link_to: "/products",
    });

    // Reset form
    setNewName(""); setNewHs(""); setNewMoq(""); setNewLead("");
    setNewCapacity(""); setNewDesc(""); setNewCert("");
    setSaving(false);
    setDialogOpen(false);
    loadProducts();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] p-8">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[320px] rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-body">Product Name *</label>
                <Input placeholder="e.g. CNC Precision Components" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-body">Description</label>
                <Input placeholder="Brief product description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">HS Code</label>
                  <Input placeholder="e.g. 8466.93" value={newHs} onChange={(e) => setNewHs(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">MOQ</label>
                  <Input placeholder="e.g. 500 units" value={newMoq} onChange={(e) => setNewMoq(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Lead Time</label>
                  <Input placeholder="e.g. 21 days" value={newLead} onChange={(e) => setNewLead(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Capacity / month</label>
                  <Input placeholder="e.g. 5,000 units" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-body">Certifications</label>
                <Select value={newCert} onValueChange={setNewCert}>
                  <SelectTrigger><SelectValue placeholder="Select certification" /></SelectTrigger>
                  <SelectContent>
                    {["ISO 9001:2015", "CE Mark", "AGMA", "RoHS", "None yet"].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAdd} disabled={!newName.trim() || saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : "Add Product"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <StaggerGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <StaggerItem key={p.id}>
            <ProductCard product={p} onRefresh={loadProducts} />
          </StaggerItem>
        ))}
        <StaggerItem>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex min-h-[320px] w-full flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border text-text-muted transition-colors hover:border-action-blue hover:text-action-blue"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle">
              <Plus size={22} />
            </div>
            <span className="text-sm font-semibold">Add Product</span>
          </button>
        </StaggerItem>
      </StaggerGrid>

      {products.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-text-muted">No products yet. Add your first product to get started!</p>
        </div>
      )}
    </div>
  );
}
