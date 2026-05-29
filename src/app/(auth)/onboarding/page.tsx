"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ArrowRight, HelpCircle, X, Plus, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import confetti from "canvas-confetti";

const STEPS = ["Company Info", "Product Catalogue", "Export Readiness", "Documents"];

function Toggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex gap-1 rounded-[10px] bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-[7px] px-4.5 py-2 text-[13px] font-semibold transition-all ${
            value === o.value
              ? "bg-card text-action-blue shadow-sm"
              : "text-text-secondary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function UploadZone({
  label,
  uploaded,
  onUpload,
  uploading,
}: {
  label: string;
  uploaded: boolean;
  onUpload: (file: File) => void;
  uploading?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-body">{label}</label>
      {uploaded ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-success/30 bg-green-bg px-4 py-3.5">
          <Check size={18} className="text-success" />
          <span className="flex-1 text-sm font-medium text-text-body">
            {label.toLowerCase().replace(/ /g, "_")}.pdf
          </span>
          <span className="text-xs text-text-muted">Uploaded</span>
        </div>
      ) : (
        <label className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-[10px] border-2 border-dashed border-border bg-background p-6 transition-colors hover:border-action-blue hover:bg-hover-blue">
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-action-blue" />
          ) : (
            <Upload size={24} className="text-text-muted" />
          )}
          <span className="text-[13px] font-medium text-text-body">
            {uploading ? "Uploading..." : "Drag files or click to upload"}
          </span>
          <span className="text-xs text-text-muted">PDF, JPG — Max 10MB</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </label>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 fields
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 fields
  const [products, setProducts] = useState([
    { name: "", description: "", capacity: "", moq: "", certifications: "" },
  ]);

  // Step 3 fields
  const [hasIEC, setHasIEC] = useState("no");
  const [iecNumber, setIecNumber] = useState("");
  const [adCode, setAdCode] = useState("unsure");
  const [exported, setExported] = useState("no");
  const [experience, setExperience] = useState("");

  // Step 4 fields
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  // Load user and existing profile
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStep(profile.onboarding_step || 0);
        if (profile.business_name) setBusinessName(profile.business_name);
        if (profile.gst_number) setGstNumber(profile.gst_number);
        if (profile.year_established) setYearEstablished(profile.year_established);
        if (profile.annual_turnover) setAnnualTurnover(profile.annual_turnover);
        if (profile.full_name) setContactPerson(profile.full_name);
        if (profile.contact_phone) setPhone(profile.contact_phone);
        if (profile.has_iec) setHasIEC(profile.has_iec ? "yes" : "no");
        if (profile.iec_number) setIecNumber(profile.iec_number);
        if (profile.ad_code_registered) setAdCode(profile.ad_code_registered);
        if (profile.has_exported) setExported(profile.has_exported ? "yes" : "no");
        if (profile.export_experience) setExperience(profile.export_experience);
      }

      // Load existing products
      const { data: existingProducts } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id);

      if (existingProducts && existingProducts.length > 0) {
        setProducts(
          existingProducts.map((p) => ({
            name: p.name || "",
            description: p.description || "",
            capacity: p.production_capacity || "",
            moq: p.moq || "",
            certifications: (p.certifications || [])[0] || "",
          }))
        );
      }
    }
    loadProfile();
  }, []);

  const saveStep = async (nextStep: number) => {
    if (!userId) return;
    setSaving(true);

    try {
      if (step === 0) {
        await supabase.from("profiles").update({
          business_name: businessName,
          gst_number: gstNumber,
          year_established: yearEstablished,
          annual_turnover: annualTurnover,
          full_name: contactPerson,
          contact_phone: phone,
          onboarding_step: nextStep,
        }).eq("id", userId);
      }

      if (step === 1) {
        // Delete old products, insert new ones
        await supabase.from("products").delete().eq("user_id", userId);
        const productRows = products
          .filter((p) => p.name.trim())
          .map((p) => ({
            user_id: userId,
            name: p.name,
            description: p.description,
            production_capacity: p.capacity,
            moq: p.moq,
            certifications: p.certifications ? [p.certifications] : [],
            status: "draft" as const,
          }));
        if (productRows.length > 0) {
          await supabase.from("products").insert(productRows);
        }
        await supabase.from("profiles").update({ onboarding_step: nextStep }).eq("id", userId);
      }

      if (step === 2) {
        await supabase.from("profiles").update({
          has_iec: hasIEC === "yes",
          iec_number: hasIEC === "yes" ? iecNumber : null,
          ad_code_registered: adCode,
          has_exported: exported === "yes",
          export_experience: experience,
          onboarding_step: nextStep,
        }).eq("id", userId);
      }

      if (step === 3) {
        await supabase.from("profiles").update({
          onboarding_step: 4,
          onboarding_completed: true,
        }).eq("id", userId);

        // Log activity
        await supabase.from("activity_log").insert({
          user_id: userId,
          badge: "Done",
          badge_color: "green",
          text: "Onboarding completed — Welcome to ArthaFlow!",
          link_to: "/dashboard",
        });
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const fireConfetti = () => {
    const colors = ["#2563EB", "#D4A843", "#059669", "#7C3AED"];
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors });
    setTimeout(() => {
      confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
    }, 200);
    setTimeout(() => {
      confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
    }, 400);
  };

  const next = async () => {
    if (step < 3) {
      await saveStep(step + 1);
      setStep(step + 1);
    } else {
      await saveStep(4);
      fireConfetti();
      // Brief delay so user sees the celebration
      setTimeout(() => router.push("/dashboard"), 1400);
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFileUpload = async (label: string, file: File) => {
    if (!userId) return;
    setUploading(label);

    try {
      const filePath = `${userId}/${label.toLowerCase().replace(/ /g, "_")}_${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save document record
      await supabase.from("documents").insert({
        user_id: userId,
        name: label,
        category: "company",
        status: "pending_review",
        file_url: filePath,
        file_size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      });

      setUploads({ ...uploads, [label]: true });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex h-16 items-center bg-navy px-8">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-artha-gold">
            ArthaFlow
          </Link>
          <Button variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10">
            <HelpCircle size={15} /> Need Help?
          </Button>
        </div>
      </nav>

      <div className="bg-background px-8 pb-16 pt-12">
        {/* Step Indicator */}
        <div className="mx-auto mb-10 flex max-w-[700px] items-center justify-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-300 ${
                    i <= step ? "bg-action-blue text-white" : "bg-subtle text-text-muted"
                  } ${i === step ? "ring-3 ring-hover-blue" : ""}`}
                >
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:block ${
                    i === step ? "font-semibold text-action-blue" : "font-medium text-text-secondary"
                  }`}
                >
                  {s}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={`mx-2 mb-7 h-0.5 min-w-[30px] flex-1 transition-colors duration-300 ${
                    i < step ? "bg-action-blue" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="mx-auto max-w-[600px] rounded-2xl border border-border bg-card p-9 shadow-sm">
          {/* Step 1 */}
          {step === 0 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">Step 1: Company Information</h2>
              <p className="mb-7 text-sm text-text-secondary">Tell us about your business so we can set up your export profile.</p>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Business Name *</label>
                  <Input placeholder="e.g. Rajesh Engineering Pvt. Ltd." value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">GST Number *</label>
                  <Input placeholder="e.g. 27AABCU9603R1ZM" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">Year Established</label>
                    <Input placeholder="e.g. 2008" value={yearEstablished} onChange={(e) => setYearEstablished(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">Annual Turnover Range</label>
                    <Select value={annualTurnover} onValueChange={setAnnualTurnover}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {["Under ₹1 Cr", "₹1-5 Cr", "₹5-25 Cr", "₹25-100 Cr", "Over ₹100 Cr"].map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">Contact Person</label>
                    <Input placeholder="Rajesh Patel" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">Phone Number</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">+91</span>
                      <Input className="pl-11" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">Step 2: Product Catalogue</h2>
              <p className="mb-7 text-sm text-text-secondary">Add the products you want to export.</p>
              <div className="mb-4 flex flex-col gap-4">
                {products.map((p, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-[13px] font-bold text-text-heading">Product {i + 1}</span>
                      {products.length > 1 && (
                        <button onClick={() => setProducts(products.filter((_, j) => j !== i))} className="text-error"><X size={16} /></button>
                      )}
                    </div>
                    <div className="flex flex-col gap-3.5">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-body">Product Name</label>
                        <Input placeholder="e.g. CNC Precision Components" value={p.name} onChange={(e) => { const u = [...products]; u[i].name = e.target.value; setProducts(u); }} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-body">Description</label>
                        <Input placeholder="Brief product description" value={p.description} onChange={(e) => { const u = [...products]; u[i].description = e.target.value; setProducts(u); }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-text-body">Capacity / month</label>
                          <Input placeholder="e.g. 5,000 units" value={p.capacity} onChange={(e) => { const u = [...products]; u[i].capacity = e.target.value; setProducts(u); }} />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-text-body">MOQ</label>
                          <Input placeholder="e.g. 500 units" value={p.moq} onChange={(e) => { const u = [...products]; u[i].moq = e.target.value; setProducts(u); }} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-body">Certifications</label>
                        <Select value={p.certifications} onValueChange={(v) => { const u = [...products]; u[i].certifications = v; setProducts(u); }}>
                          <SelectTrigger><SelectValue placeholder="Select certifications" /></SelectTrigger>
                          <SelectContent>
                            {["ISO 9001:2015", "CE Mark", "AGMA", "RoHS", "None yet"].map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setProducts([...products, { name: "", description: "", capacity: "", moq: "", certifications: "" }])}
                className="flex items-center gap-2 py-2 text-sm font-semibold text-action-blue"
              >
                <Plus size={16} /> Add Another Product
              </button>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">Step 3: Export Readiness</h2>
              <p className="mb-7 text-sm text-text-secondary">Help us understand where you are on your export journey.</p>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="mb-2.5 block text-[13px] font-medium text-text-body">Do you have an IEC?</label>
                  <Toggle value={hasIEC} onChange={setHasIEC} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
                </div>
                {hasIEC === "yes" && (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">IEC Number</label>
                    <Input placeholder="e.g. AABCR1234E" value={iecNumber} onChange={(e) => setIecNumber(e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="mb-2.5 block text-[13px] font-medium text-text-body">Is your AD Code registered?</label>
                  <Toggle value={adCode} onChange={setAdCode} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]} />
                </div>
                <div>
                  <label className="mb-2.5 block text-[13px] font-medium text-text-body">Have you exported before?</label>
                  <Toggle value={exported} onChange={setExported} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No, first time" }]} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">Export experience (optional)</label>
                  <textarea
                    placeholder="Any markets, challenges..."
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="min-h-[90px] w-full resize-y rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-text-body outline-none transition-colors focus:border-action-blue focus:ring-3 focus:ring-action-blue/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 3 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">Step 4: Documents</h2>
              <p className="mb-7 text-sm text-text-secondary">Upload your key documents. We&apos;ll verify them within 24 hours.</p>
              <div className="flex flex-col gap-3.5">
                {["GST Certificate", "Udyam Certificate", "Product Catalogue / Brochure", "Certifications"].map((d) => (
                  <UploadZone
                    key={d}
                    label={d}
                    uploaded={!!uploads[d]}
                    uploading={uploading === d}
                    onUpload={(file) => handleFileUpload(d, file)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={back}>Back</Button>
            ) : (
              <Button variant="outline" onClick={() => router.push("/dashboard")}>Save Draft</Button>
            )}
            <Button onClick={next} disabled={saving}>
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {step === 0 && "Next: Product Catalogue"}
                  {step === 1 && "Next: Export Readiness"}
                  {step === 2 && "Next: Documents"}
                  {step === 3 && "Complete Setup"}
                  {step < 3 ? <ArrowRight size={16} /> : <Check size={16} />}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
