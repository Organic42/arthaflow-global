"use client";

import { useState, useEffect, useCallback } from "react";
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

function ProductCard({ product, onEdit }: { product: Product; onEdit: (p: Product) => void }) {
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
          <button
            onClick={() => onEdit(product)}
            className="text-[13px] font-medium text-text-secondary hover:text-text-heading"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyForm = {
  name: "",
  hs: "",
  moq: "",
  lead: "",
  capacity: "",
  desc: "",
  cert: "",
};

export default function ProductCataloguePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editing an existing product reuses this same dialog/form rather than a
  // second one — null means "Add Product" mode, set means "Edit" mode.
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state, shared by add and edit
  const [form, setForm] = useState(emptyForm);

  const loadProducts = useCallback(async () => {
    setLoadError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }
    setProducts(data || []);
    setLoading(false);
  }, [supabase]);

  // The loader is async and every setState in it runs after an await, so no
  // state is set during the effect's synchronous phase. The rule flags the
  // call because it cannot see across the await boundary; satisfying it
  // properly means a data library or Server Components, not a change here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProducts(); }, [loadProducts]);

  function openAddDialog() {
    setEditingProduct(null);
    setForm(emptyForm);
    setSaveError(null);
    setDialogOpen(true);
  }

  function openEditDialog(p: Product) {
    setEditingProduct(p);
    setForm({
      name: p.name,
      hs: p.hs_code || "",
      moq: p.moq || "",
      lead: p.lead_time || "",
      capacity: p.production_capacity || "",
      desc: p.description || "",
      cert: p.certifications?.[0] || "",
    });
    setSaveError(null);
    setDialogOpen(true);
  }

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !form.name.trim()) return;
    setSaving(true);
    setSaveError(null);

    const row = {
      name: form.name,
      hs_code: form.hs || null,
      moq: form.moq || null,
      lead_time: form.lead || null,
      production_capacity: form.capacity || null,
      description: form.desc || null,
      certifications: form.cert ? [form.cert] : [],
      status: form.hs && form.moq && form.lead ? "export_ready" : "incomplete",
    };

    const { error } = editingProduct
      ? await supabase
          .from("products")
          .update(row)
          .eq("id", editingProduct.id)
          .eq("user_id", user.id)
      : await supabase.from("products").insert({ ...row, user_id: user.id });

    if (error) {
      // A failed save must not look like a successful one — the dialog stays
      // open with the error shown, instead of resetting and closing as if it
      // had worked.
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    // Activity feed entry is best-effort: worth logging on failure, not
    // worth blocking or alarming the user over — the product itself saved.
    const { error: activityErr } = await supabase.from("activity_log").insert({
      user_id: user.id,
      badge: editingProduct ? "Updated" : "New",
      badge_color: "blue",
      text: `Product ${editingProduct ? "updated" : "added"} — ${form.name}`,
      link_to: "/products",
    });
    if (activityErr) console.error("Activity log insert failed:", activityErr.message);

    setSaving(false);
    setDialogOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
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
      {loadError && (
        <div className="mb-4 rounded-lg bg-red-bg px-4 py-3 text-sm text-error">
          {loadError}{" "}
          <button onClick={loadProducts} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">Products</h1>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingProduct(null); setSaveError(null); }
          }}
        >
          <DialogTrigger render={<Button onClick={openAddDialog} />}>
  <Plus size={16} /> Add Product
</DialogTrigger>
          <DialogContent className="max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              {saveError && (
                <div className="rounded-lg bg-red-bg px-3 py-2.5 text-[13px] text-error">
                  {saveError}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-body">Product Name *</label>
                <Input placeholder="e.g. CNC Precision Components" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-body">Description</label>
                <Input placeholder="Brief product description" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">HS Code</label>
                  <Input placeholder="e.g. 8466.93" value={form.hs} onChange={(e) => setForm((f) => ({ ...f, hs: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">MOQ</label>
                  <Input placeholder="e.g. 500 units" value={form.moq} onChange={(e) => setForm((f) => ({ ...f, moq: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Lead Time</label>
                  <Input placeholder="e.g. 21 days" value={form.lead} onChange={(e) => setForm((f) => ({ ...f, lead: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Capacity / month</label>
                  <Input placeholder="e.g. 5,000 units" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-body">Certifications</label>
                <Select value={form.cert} onValueChange={(val) => setForm((f) => ({ ...f, cert: val || "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select certification" /></SelectTrigger>
                  <SelectContent>
                    {["ISO 9001:2015", "CE Mark", "AGMA", "RoHS", "None yet"].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <DialogClose render={<Button variant="outline" />}>
  Cancel
</DialogClose>
                <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingProduct ? (
                    "Save Changes"
                  ) : (
                    "Add Product"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <StaggerGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <StaggerItem key={p.id}>
            <ProductCard product={p} onEdit={openEditDialog} />
          </StaggerItem>
        ))}
        <StaggerItem>
          <button
            onClick={openAddDialog}
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
