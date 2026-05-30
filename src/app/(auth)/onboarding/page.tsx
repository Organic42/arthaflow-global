"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Check, ArrowRight, HelpCircle, X, Plus, Upload, Loader2, AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";

const STEPS = ["Company Info", "Product Catalogue", "Export Readiness", "Documents"];

/* ─── Toggle ─── */
function Toggle({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex gap-1 rounded-[10px] bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-[7px] px-4 py-2 text-[13px] font-semibold transition-all ${
            value === o.value
              ? "bg-card text-action-blue shadow-sm"
              : "text-text-secondary hover:text-text-heading"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─── UploadZone ─── */
function UploadZone({ label, uploaded, onUpload, uploading, required }: {
  label: string;
  uploaded: boolean;
  onUpload: (file: File) => void;
  uploading?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-body">
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
      <AnimatePresence mode="wait">
        {uploaded ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 rounded-[10px] border border-success/30 bg-green-bg px-4 py-3.5"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.05 }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white"
            >
              <Check size={14} strokeWidth={3} />
            </motion.div>
            <span className="flex-1 text-sm font-medium text-text-body">
              {label.toLowerCase().replace(/ \/ /g, "_").replace(/ /g, "_")}.pdf
            </span>
            <span className="text-xs text-text-success font-medium text-success">Uploaded ✓</span>
          </motion.div>
        ) : (
          <motion.label
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-[10px] border-2 border-dashed border-border bg-background p-6 transition-colors hover:border-action-blue hover:bg-hover-blue"
          >
            {uploading ? (
              <Loader2 size={24} className="animate-spin text-action-blue" />
            ) : (
              <Upload size={24} className="text-text-muted" />
            )}
            <span className="text-[13px] font-medium text-text-body">
              {uploading ? "Uploading..." : "Drag files or click to upload"}
            </span>
            <span className="text-xs text-text-muted">PDF, JPG, PNG — Max 10MB</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
            />
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Field wrapper with error ─── */
function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-body">
        {label}{required && <span className="ml-1 text-error">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-error">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2
  const [products, setProducts] = useState([
    { name: "", description: "", capacity: "", moq: "", certifications: "" },
  ]);
  const [step2Errors, setStep2Errors] = useState<string[]>([]);

  // Step 3
  const [hasIEC, setHasIEC] = useState("no");
  const [iecNumber, setIecNumber] = useState("");
  const [adCode, setAdCode] = useState("unsure");
  const [exported, setExported] = useState("no");
  const [experience, setExperience] = useState("");

  // Step 4
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();

      if (profile) {
        setStep(profile.onboarding_step || 0);
        if (profile.business_name) setBusinessName(profile.business_name);
        if (profile.gst_number) setGstNumber(profile.gst_number);
        if (profile.year_established) setYearEstablished(profile.year_established);
        if (profile.annual_turnover) setAnnualTurnover(profile.annual_turnover);
        if (profile.full_name) setContactPerson(profile.full_name);
        if (profile.contact_phone) setPhone(profile.contact_phone);
        if (profile.has_iec != null) setHasIEC(profile.has_iec ? "yes" : "no");
        if (profile.iec_number) setIecNumber(profile.iec_number);
        if (profile.ad_code_registered) setAdCode(profile.ad_code_registered);
        if (profile.has_exported != null) setExported(profile.has_exported ? "yes" : "no");
        if (profile.export_experience) setExperience(profile.export_experience);
      }

      const { data: existingProducts } = await supabase
        .from("products").select("*").eq("user_id", user.id);
      if (existingProducts?.length) {
        setProducts(existingProducts.map((p) => ({
          name: p.name || "",
          description: p.description || "",
          capacity: p.production_capacity || "",
          moq: p.moq || "",
          certifications: (p.certifications || [])[0] || "",
        })));
      }

      // Check which docs are already uploaded
      const { data: existingDocs } = await supabase
        .from("documents").select("name").eq("user_id", user.id);
      if (existingDocs?.length) {
        const uploaded: Record<string, boolean> = {};
        existingDocs.forEach((d) => { uploaded[d.name] = true; });
        setUploads(uploaded);
      }

      setLoading(false);
    }
    load();
  }, []);

  /* ─── Validation ─── */
  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!businessName.trim()) errs.businessName = "Business name is required";
    if (!gstNumber.trim()) errs.gstNumber = "GST number is required";
    if (!contactPerson.trim()) errs.contactPerson = "Contact person is required";
    if (!phone.trim()) errs.phone = "Phone number is required";
    setStep1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: string[] = products.map((p, i) =>
      !p.name.trim() ? `Product ${i + 1} name is required` : ""
    );
    setStep2Errors(errs);
    return errs.every((e) => !e);
  }

  /* ─── Save & navigate ─── */
  const goNext = async () => {
    setSaveError(null);

    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;

    setSaving(true);
    const nextStep = step + 1;

    try {
      if (step === 0) {
        const { error } = await supabase.from("profiles").update({
          business_name: businessName.trim(),
          gst_number: gstNumber.trim(),
          year_established: yearEstablished,
          annual_turnover: annualTurnover,
          full_name: contactPerson.trim(),
          contact_phone: phone.trim(),
          onboarding_step: nextStep,
        }).eq("id", userId!);
        if (error) throw error;
      }

      if (step === 1) {
        await supabase.from("products").delete().eq("user_id", userId!);
        const rows = products.filter((p) => p.name.trim()).map((p) => ({
          user_id: userId!,
          name: p.name.trim(),
          description: p.description || null,
          production_capacity: p.capacity || null,
          moq: p.moq || null,
          certifications: p.certifications ? [p.certifications] : [],
          status: (p.moq && p.capacity) ? "export_ready" : "incomplete",
        }));
        if (rows.length) {
          const { error } = await supabase.from("products").insert(rows);
          if (error) throw error;
        }
        await supabase.from("profiles").update({ onboarding_step: nextStep }).eq("id", userId!);
      }

      if (step === 2) {
        const { error } = await supabase.from("profiles").update({
          has_iec: hasIEC === "yes",
          iec_number: hasIEC === "yes" ? iecNumber.trim() || null : null,
          ad_code_registered: adCode,
          has_exported: exported === "yes",
          export_experience: experience || null,
          onboarding_step: nextStep,
        }).eq("id", userId!);
        if (error) throw error;
      }

      if (step === 3) {
        const { error } = await supabase.from("profiles").update({
          onboarding_step: 4,
          onboarding_completed: true,
        }).eq("id", userId!);
        if (error) throw error;

        await supabase.from("activity_log").insert({
          user_id: userId!,
          badge: "Done",
          badge_color: "green",
          text: "Onboarding completed — welcome to ArthaFlow! 🎉",
          link_to: "/dashboard",
        });

        // Fire confetti
        const colors = ["#2563EB", "#D4A843", "#059669", "#7C3AED"];
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors });
        setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors }), 200);
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors }), 400);
        setTimeout(() => router.push("/dashboard"), 1600);
        return;
      }

      setDirection(1);
      setStep(nextStep);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setSaveError(null);
    setDirection(-1);
    setStep(step - 1);
  };

  const saveDraft = async () => {
    if (!userId) return;
    await supabase.from("profiles").update({ onboarding_step: step }).eq("id", userId);
    router.push("/login");
  };

  const handleFileUpload = async (label: string, file: File) => {
    if (!userId) return;
    setUploading(label);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${userId}/${label.toLowerCase().replace(/ /g, "_")}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      await supabase.from("documents").insert({
        user_id: userId,
        name: label,
        category: "company",
        status: "pending_review",
        file_url: filePath,
        file_size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      });

      setUploads((prev) => ({ ...prev, [label]: true }));
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(null);
    }
  };

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-action-blue" />
          <p className="text-sm text-text-secondary">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -48 }),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex h-16 items-center border-b border-border bg-card/80 px-8 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-artha-gold">
            ArthaFlow
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">Step {step + 1} of 4</span>
            <Button
              variant="outline"
              size="sm"
              onClick={saveDraft}
            >
              <HelpCircle size={14} /> Save & Exit
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[660px] px-6 pb-20 pt-10">
        {/* Step indicator */}
        <div className="mb-10 flex items-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={{
                    backgroundColor: i < step ? "#059669" : i === step ? "#2563EB" : undefined,
                    borderColor: i <= step ? "transparent" : "#E2E8F0",
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors ${
                    i <= step ? "text-white" : "border-border bg-background text-text-muted"
                  }`}
                >
                  {i < step ? <Check size={16} strokeWidth={2.5} /> : i + 1}
                </motion.div>
                <span className={`hidden text-[11px] font-medium sm:block ${
                  i === step ? "text-action-blue" : i < step ? "text-success" : "text-text-muted"
                }`}>
                  {s}
                </span>
              </div>
              {i < 3 && (
                <div className="relative mx-2 mb-5 h-0.5 flex-1">
                  <div className="absolute inset-0 rounded-full bg-border" />
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-success"
                    animate={{ width: i < step ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-red-bg px-4 py-3 text-sm text-error"
          >
            <AlertCircle size={16} className="shrink-0" />
            {saveError}
          </motion.div>
        )}

        {/* Form card with animated transitions */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="p-8"
            >

              {/* ─── STEP 1: Company Info ─── */}
              {step === 0 && (
                <div>
                  <h2 className="mb-1 text-xl font-extrabold text-text-heading">
                    Company Information
                  </h2>
                  <p className="mb-7 text-sm text-text-secondary">
                    Tell us about your business so we can set up your export profile.
                  </p>
                  <div className="flex flex-col gap-5">
                    <Field label="Business Name" required error={step1Errors.businessName}>
                      <Input
                        placeholder="e.g. Rajesh Engineering Pvt. Ltd."
                        value={businessName}
                        onChange={(e) => { setBusinessName(e.target.value); setStep1Errors((p) => ({ ...p, businessName: "" })); }}
                        className={step1Errors.businessName ? "border-error" : ""}
                      />
                    </Field>
                    <Field label="GST Number" required error={step1Errors.gstNumber}>
                      <Input
                        placeholder="e.g. 27AABCU9603R1ZM"
                        value={gstNumber}
                        onChange={(e) => { setGstNumber(e.target.value.toUpperCase()); setStep1Errors((p) => ({ ...p, gstNumber: "" })); }}
                        className={`font-mono ${step1Errors.gstNumber ? "border-error" : ""}`}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Year Established">
                        <Input
                          placeholder="e.g. 2008"
                          value={yearEstablished}
                          onChange={(e) => setYearEstablished(e.target.value)}
                        />
                      </Field>
                      <Field label="Annual Turnover">
                        <Select value={annualTurnover} onValueChange={(v) => setAnnualTurnover(v ?? "")}>
                          <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                          <SelectContent>
                            {["Under ₹1 Cr", "₹1–5 Cr", "₹5–25 Cr", "₹25–100 Cr", "Over ₹100 Cr"].map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Contact Person" required error={step1Errors.contactPerson}>
                        <Input
                          placeholder="Rajesh Patel"
                          value={contactPerson}
                          onChange={(e) => { setContactPerson(e.target.value); setStep1Errors((p) => ({ ...p, contactPerson: "" })); }}
                          className={step1Errors.contactPerson ? "border-error" : ""}
                        />
                      </Field>
                      <Field label="Phone Number" required error={step1Errors.phone}>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">+91</span>
                          <Input
                            className={`pl-11 ${step1Errors.phone ? "border-error" : ""}`}
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setStep1Errors((p) => ({ ...p, phone: "" })); }}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: Product Catalogue ─── */}
              {step === 1 && (
                <div>
                  <h2 className="mb-1 text-xl font-extrabold text-text-heading">Product Catalogue</h2>
                  <p className="mb-7 text-sm text-text-secondary">
                    Add the products you want to export. At least one product is required.
                  </p>
                  <div className="mb-4 flex flex-col gap-4">
                    {products.map((p, i) => (
                      <div key={i} className="rounded-xl border border-border bg-background p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[13px] font-bold text-text-heading">Product {i + 1}</span>
                          {products.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setProducts(products.filter((_, j) => j !== i))}
                              className="rounded-md p-1 text-error hover:bg-red-bg"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col gap-3.5">
                          <Field label="Product Name" required error={step2Errors[i]}>
                            <Input
                              placeholder="e.g. CNC Precision Components"
                              value={p.name}
                              onChange={(e) => {
                                const u = [...products]; u[i].name = e.target.value; setProducts(u);
                                const errs = [...step2Errors]; errs[i] = ""; setStep2Errors(errs);
                              }}
                              className={step2Errors[i] ? "border-error" : ""}
                            />
                          </Field>
                          <Field label="Description">
                            <Input
                              placeholder="Brief product description for buyers"
                              value={p.description}
                              onChange={(e) => { const u = [...products]; u[i].description = e.target.value; setProducts(u); }}
                            />
                          </Field>
                          <div className="grid grid-cols-2 gap-3.5">
                            <Field label="Production Capacity / month">
                              <Input
                                placeholder="e.g. 5,000 units"
                                value={p.capacity}
                                onChange={(e) => { const u = [...products]; u[i].capacity = e.target.value; setProducts(u); }}
                              />
                            </Field>
                            <Field label="Minimum Order Qty">
                              <Input
                                placeholder="e.g. 500 units"
                                value={p.moq}
                                onChange={(e) => { const u = [...products]; u[i].moq = e.target.value; setProducts(u); }}
                              />
                            </Field>
                          </div>
                          <Field label="Certifications">
                            <Select
                              value={p.certifications}
                              onValueChange={(v) => { const u = [...products]; u[i].certifications = v ?? ""; setProducts(u); }}
                            >
                              <SelectTrigger><SelectValue placeholder="Select if any" /></SelectTrigger>
                              <SelectContent>
                                {["ISO 9001:2015", "CE Mark", "AGMA", "RoHS", "BIS", "None yet"].map((o) => (
                                  <SelectItem key={o} value={o}>{o}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProducts([...products, { name: "", description: "", capacity: "", moq: "", certifications: "" }])}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-action-blue hover:bg-hover-blue"
                  >
                    <Plus size={16} /> Add Another Product
                  </button>
                </div>
              )}

              {/* ─── STEP 3: Export Readiness ─── */}
              {step === 2 && (
                <div>
                  <h2 className="mb-1 text-xl font-extrabold text-text-heading">Export Readiness</h2>
                  <p className="mb-7 text-sm text-text-secondary">
                    Help us understand where you are on your export journey. We&apos;ll guide you through what&apos;s missing.
                  </p>
                  <div className="flex flex-col gap-7">
                    <div>
                      <p className="mb-2.5 text-[13px] font-medium text-text-body">
                        Do you have an IEC (Import Export Code)?
                      </p>
                      <Toggle
                        value={hasIEC}
                        onChange={setHasIEC}
                        options={[{ value: "yes", label: "Yes, I have one" }, { value: "no", label: "Not yet" }]}
                      />
                      {hasIEC === "no" && (
                        <p className="mt-2 text-xs text-text-muted">
                          No worries — we&apos;ll guide you through IEC registration. It takes ~2 days.
                        </p>
                      )}
                    </div>

                    <AnimatePresence>
                      {hasIEC === "yes" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Field label="IEC Number">
                            <Input
                              placeholder="e.g. AABCR1234E"
                              value={iecNumber}
                              onChange={(e) => setIecNumber(e.target.value.toUpperCase())}
                              className="font-mono"
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <p className="mb-2.5 text-[13px] font-medium text-text-body">
                        Is your AD Code registered with customs?
                      </p>
                      <Toggle
                        value={adCode}
                        onChange={setAdCode}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                          { value: "unsure", label: "Not sure" },
                        ]}
                      />
                    </div>

                    <div>
                      <p className="mb-2.5 text-[13px] font-medium text-text-body">
                        Have you exported before?
                      </p>
                      <Toggle
                        value={exported}
                        onChange={setExported}
                        options={[
                          { value: "yes", label: "Yes, I've exported" },
                          { value: "no", label: "No, first time" },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                        Tell us more (optional)
                      </label>
                      <textarea
                        placeholder={
                          exported === "yes"
                            ? "Which countries have you exported to? What challenges did you face?"
                            : "What products are you hoping to export? Any specific countries in mind?"
                        }
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-text-body outline-none transition-colors placeholder:text-text-muted focus:border-action-blue focus:ring-2 focus:ring-action-blue/10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 4: Documents ─── */}
              {step === 3 && (
                <div>
                  <h2 className="mb-1 text-xl font-extrabold text-text-heading">Upload Documents</h2>
                  <p className="mb-2 text-sm text-text-secondary">
                    Upload your company documents so we can verify your business. We&apos;ll review within 24 hours.
                  </p>
                  <div className="mb-6 flex items-center gap-2 rounded-lg bg-blue-bg px-3.5 py-2.5 text-xs text-action-blue">
                    <AlertCircle size={14} className="shrink-0" />
                    You can skip optional documents and upload them later from your dashboard.
                  </div>
                  <div className="flex flex-col gap-4">
                    <UploadZone
                      label="GST Certificate"
                      required
                      uploaded={!!uploads["GST Certificate"]}
                      uploading={uploading === "GST Certificate"}
                      onUpload={(f) => handleFileUpload("GST Certificate", f)}
                    />
                    <UploadZone
                      label="Udyam Registration"
                      uploaded={!!uploads["Udyam Registration"]}
                      uploading={uploading === "Udyam Registration"}
                      onUpload={(f) => handleFileUpload("Udyam Registration", f)}
                    />
                    <UploadZone
                      label="Product Catalogue / Brochure"
                      uploaded={!!uploads["Product Catalogue / Brochure"]}
                      uploading={uploading === "Product Catalogue / Brochure"}
                      onUpload={(f) => handleFileUpload("Product Catalogue / Brochure", f)}
                    />
                    <UploadZone
                      label="Certifications"
                      uploaded={!!uploads["Certifications"]}
                      uploading={uploading === "Certifications"}
                      onUpload={(f) => handleFileUpload("Certifications", f)}
                    />
                  </div>

                  {/* Upload summary */}
                  <div className="mt-5 rounded-lg bg-subtle px-4 py-3">
                    <p className="text-xs font-medium text-text-secondary">
                      {Object.values(uploads).filter(Boolean).length} of 4 documents uploaded
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <motion.div
                        className="h-full rounded-full bg-action-blue"
                        animate={{ width: `${(Object.values(uploads).filter(Boolean).length / 4) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navigation footer */}
          <div className="flex items-center justify-between border-t border-border bg-background px-8 py-5">
            {step > 0 ? (
              <Button variant="outline" onClick={goBack} disabled={saving}>
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={saveDraft} className="text-text-secondary">
                Save Draft
              </Button>
            )}

            <div className="flex items-center gap-3">
              {/* Skip for step 4 */}
              {step === 3 && (
                <Button variant="ghost" className="text-text-secondary" onClick={goNext} disabled={saving}>
                  Skip for now
                </Button>
              )}
              <Button onClick={goNext} disabled={saving || !!uploading}>
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {step === 3 ? (
                      <>Complete Setup <Check size={16} /></>
                    ) : (
                      <>
                        {step === 0 && "Next: Products"}
                        {step === 1 && "Next: Export Readiness"}
                        {step === 2 && "Next: Documents"}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Your data is encrypted and never shared without your consent. &nbsp;
          <a className="text-action-blue hover:underline cursor-pointer">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
