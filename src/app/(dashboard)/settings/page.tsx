"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Loader2, CheckCircle, User, Building2, Globe, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "motion/react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  gst_number: string | null;
  year_established: string | null;
  annual_turnover: string | null;
  contact_phone: string | null;
  iec_number: string | null;
  has_iec: boolean;
  ad_code_registered: string;
  has_exported: boolean;
  export_experience: string | null;
}

// ── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-body">
        {label}
      </label>
      {description && (
        <p className="mb-2 text-xs text-text-muted">{description}</p>
      )}
      {children}
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────

function Section({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-subtle px-6 py-5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-text-heading">{title}</h2>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");
  const [iecNumber, setIecNumber] = useState("");
  const [hasIec, setHasIec] = useState(false);
  const [adCode, setAdCode] = useState("unsure");
  const [hasExported, setHasExported] = useState(false);
  const [exportExperience, setExportExperience] = useState("");

  // Track original values for dirty check
  const [original, setOriginal] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email || "");

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (p) {
      setFullName(p.full_name || "");
      setPhone(p.contact_phone || "");
      setBusinessName(p.business_name || "");
      setGstNumber(p.gst_number || "");
      setYearEstablished(p.year_established || "");
      setAnnualTurnover(p.annual_turnover || "");
      setIecNumber(p.iec_number || "");
      setHasIec(p.has_iec || false);
      setAdCode(p.ad_code_registered || "unsure");
      setHasExported(p.has_exported || false);
      setExportExperience(p.export_experience || "");
      setOriginal({
        fullName: p.full_name || "",
        phone: p.contact_phone || "",
        businessName: p.business_name || "",
        gstNumber: p.gst_number || "",
        yearEstablished: p.year_established || "",
        annualTurnover: p.annual_turnover || "",
        iecNumber: p.iec_number || "",
        hasIec: p.has_iec || false,
        adCode: p.ad_code_registered || "unsure",
        hasExported: p.has_exported || false,
        exportExperience: p.export_experience || "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Dirty check
  const isDirty =
    fullName !== original.fullName ||
    phone !== original.phone ||
    businessName !== original.businessName ||
    gstNumber !== original.gstNumber ||
    yearEstablished !== original.yearEstablished ||
    annualTurnover !== original.annualTurnover ||
    iecNumber !== original.iecNumber ||
    hasIec !== original.hasIec ||
    adCode !== original.adCode ||
    hasExported !== original.hasExported ||
    exportExperience !== original.exportExperience;

  async function handleSave() {
    setError(null);
    setSaving(true);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        contact_phone: phone,
        business_name: businessName,
        gst_number: gstNumber,
        year_established: yearEstablished,
        annual_turnover: annualTurnover,
        iec_number: iecNumber,
        has_iec: hasIec,
        ad_code_registered: adCode,
        has_exported: hasExported,
        export_experience: exportExperience,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    // Update original so dirty check resets
    setOriginal({
      fullName,
      phone,
      businessName,
      gstNumber,
      yearEstablished,
      annualTurnover,
      iecNumber,
      hasIec,
      adCode,
      hasExported,
      exportExperience,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-[800px] p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] p-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">
            Settings
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage your account and company information
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {/* Error / Success */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-center gap-2 rounded-lg bg-red-bg px-4 py-3 text-sm text-error"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-center gap-2 rounded-lg bg-green-bg px-4 py-3 text-sm text-success"
          >
            <CheckCircle size={16} />
            Your changes have been saved successfully.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        {/* ── Personal Info ──────────────────────────────────────────────── */}
        <Section
          icon={<User size={18} />}
          iconBg="bg-blue-bg"
          iconColor="text-action-blue"
          title="Personal Information"
          description="Your contact details and login information"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Full Name">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rajesh Patel"
              />
            </Field>
            <Field label="Email" description="Contact support to change your email">
              <Input value={email} disabled className="bg-subtle opacity-60" />
            </Field>
            <Field label="Phone Number">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                  +91
                </span>
                <Input
                  className="pl-11"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── Company Info ───────────────────────────────────────────────── */}
        <Section
          icon={<Building2 size={18} />}
          iconBg="bg-gold-bg"
          iconColor="text-[#92710A]"
          title="Company Information"
          description="Your business registration and financial details"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Business Name">
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="ABC Exports Pvt. Ltd."
              />
            </Field>
            <Field label="GST Number">
              <Input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </Field>
            <Field label="Year Established">
              <Input
                value={yearEstablished}
                onChange={(e) => setYearEstablished(e.target.value)}
                placeholder="2015"
                maxLength={4}
              />
            </Field>
            <Field label="Annual Turnover">
              <select
                value={annualTurnover}
                onChange={(e) => setAnnualTurnover(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text-body outline-none transition-colors focus:border-action-blue"
              >
                <option value="">Select range</option>
                <option value="under_1cr">Under ₹1 Crore</option>
                <option value="1_5cr">₹1 – 5 Crore</option>
                <option value="5_25cr">₹5 – 25 Crore</option>
                <option value="25_100cr">₹25 – 100 Crore</option>
                <option value="above_100cr">Above ₹100 Crore</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Export Readiness ────────────────────────────────────────────── */}
        <Section
          icon={<Globe size={18} />}
          iconBg="bg-green-bg"
          iconColor="text-success"
          title="Export Readiness"
          description="Your export registration and experience details"
        >
          {/* IEC */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-text-body">
              Do you have an IEC (Importer Exporter Code)?
            </label>
            <div className="flex gap-3">
              {[
                { label: "Yes", val: true },
                { label: "No", val: false },
              ].map(({ label, val }) => (
                <button
                  key={label}
                  onClick={() => setHasIec(val)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    hasIec === val
                      ? "border-action-blue bg-blue-bg text-action-blue"
                      : "border-border bg-card text-text-body hover:bg-background"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {hasIec && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Field label="IEC Number">
                  <Input
                    value={iecNumber}
                    onChange={(e) => setIecNumber(e.target.value.toUpperCase())}
                    placeholder="0300000000"
                    maxLength={10}
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AD Code */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-text-body">
              AD Code Registration
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Yes", val: "yes" },
                { label: "No", val: "no" },
                { label: "Not Sure", val: "unsure" },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setAdCode(val)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    adCode === val
                      ? "border-action-blue bg-blue-bg text-action-blue"
                      : "border-border bg-card text-text-body hover:bg-background"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Export experience */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-text-body">
              Have you exported before?
            </label>
            <div className="flex gap-3">
              {[
                { label: "Yes", val: true },
                { label: "No", val: false },
              ].map(({ label, val }) => (
                <button
                  key={label}
                  onClick={() => setHasExported(val)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    hasExported === val
                      ? "border-action-blue bg-blue-bg text-action-blue"
                      : "border-border bg-card text-text-body hover:bg-background"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {hasExported && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Field
                  label="Export Experience"
                  description="Describe your past export experience — countries, products, volumes"
                >
                  <textarea
                    value={exportExperience}
                    onChange={(e) => setExportExperience(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-body outline-none transition-colors placeholder:text-text-muted focus:border-action-blue"
                    placeholder="E.g., Exported CNC components to Germany and UAE for 3 years…"
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* Bottom save bar */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="sticky bottom-4 flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4 shadow-lg"
            >
              <p className="text-sm text-text-secondary">
                You have unsaved changes
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={load} disabled={saving}>
                  Discard
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
