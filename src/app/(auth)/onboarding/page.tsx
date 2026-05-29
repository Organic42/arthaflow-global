"use client";

import { useState } from "react";
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
import {
  Check,
  ArrowRight,
  HelpCircle,
  X,
  Plus,
  Upload,
} from "lucide-react";

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
}: {
  label: string;
  uploaded: boolean;
  onUpload: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-text-body">
        {label}
      </label>
      {uploaded ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-success/30 bg-green-bg px-4 py-3.5">
          <Check size={18} className="text-success" />
          <span className="flex-1 text-sm font-medium text-text-body">
            {label.toLowerCase().replace(/ /g, "_")}.pdf
          </span>
          <span className="text-xs text-text-muted">1.2 MB</span>
        </div>
      ) : (
        <button
          onClick={onUpload}
          className="flex w-full flex-col items-center gap-2 rounded-[10px] border-2 border-dashed border-border bg-background p-6 transition-colors hover:border-action-blue hover:bg-hover-blue"
        >
          <Upload size={24} className="text-text-muted" />
          <span className="text-[13px] font-medium text-text-body">
            Drag files or click to upload
          </span>
          <span className="text-xs text-text-muted">PDF, JPG — Max 10MB</span>
        </button>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState([
    { name: "CNC Precision Components", cap: "5,000 units", moq: "500 units" },
  ]);
  const [hasIEC, setHasIEC] = useState("yes");
  const [exported, setExported] = useState("no");
  const [uploads, setUploads] = useState<Record<string, boolean>>({});

  const next = () => {
    if (step < 3) setStep(step + 1);
    else router.push("/dashboard");
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex h-16 items-center bg-navy px-8">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-artha-gold"
          >
            ArthaFlow
          </Link>
          <Button variant="outline" size="sm" className="border-white/40 text-white hover:bg-white/10">
            <HelpCircle size={15} />
            Need Help?
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
                    i <= step
                      ? "bg-action-blue text-white"
                      : "bg-subtle text-text-muted"
                  } ${i === step ? "ring-3 ring-hover-blue" : ""}`}
                >
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:block ${
                    i === step
                      ? "font-semibold text-action-blue"
                      : "font-medium text-text-secondary"
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
          {/* Step 1: Company Info */}
          {step === 0 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">
                Step 1: Company Information
              </h2>
              <p className="mb-7 text-sm text-text-secondary">
                Tell us about your business so we can set up your export profile.
              </p>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                    Business Name *
                  </label>
                  <Input
                    placeholder="e.g. Rajesh Engineering Pvt. Ltd."
                    defaultValue="Rajesh Engineering Pvt. Ltd."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                    GST Number *
                  </label>
                  <Input placeholder="e.g. 27AABCU9603R1ZM" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                      Year Established
                    </label>
                    <Input placeholder="e.g. 2008" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                      Annual Turnover Range
                    </label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Under ₹1 Cr", "₹1-5 Cr", "₹5-25 Cr", "₹25-100 Cr", "Over ₹100 Cr"].map(
                          (o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                      Contact Person
                    </label>
                    <Input placeholder="Rajesh Patel" defaultValue="Rajesh Patel" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                        +91
                      </span>
                      <Input className="pl-11" placeholder="98765 43210" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Product Catalogue */}
          {step === 1 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">
                Step 2: Product Catalogue
              </h2>
              <p className="mb-7 text-sm text-text-secondary">
                Add the products you want to export. You can add more anytime.
              </p>
              <div className="mb-4 flex flex-col gap-4">
                {products.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-background p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-[13px] font-bold text-text-heading">
                        Product {i + 1}
                      </span>
                      {products.length > 1 && (
                        <button
                          onClick={() =>
                            setProducts(products.filter((_, j) => j !== i))
                          }
                          className="text-error"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-3.5">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                          Product Name
                        </label>
                        <Input
                          placeholder="e.g. CNC Precision Components"
                          defaultValue={p.name}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                          Description
                        </label>
                        <Input placeholder="Brief product description" />
                      </div>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                            Production Capacity / month
                          </label>
                          <Input
                            placeholder="e.g. 5,000 units"
                            defaultValue={p.cap}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                            MOQ
                          </label>
                          <Input
                            placeholder="e.g. 500 units"
                            defaultValue={p.moq}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                          Certifications
                        </label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select certifications" />
                          </SelectTrigger>
                          <SelectContent>
                            {["ISO 9001:2015", "CE Mark", "AGMA", "RoHS", "None yet"].map(
                              (o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setProducts([...products, { name: "", cap: "", moq: "" }])
                }
                className="flex items-center gap-2 py-2 text-sm font-semibold text-action-blue"
              >
                <Plus size={16} /> Add Another Product
              </button>
            </div>
          )}

          {/* Step 3: Export Readiness */}
          {step === 2 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">
                Step 3: Export Readiness
              </h2>
              <p className="mb-7 text-sm text-text-secondary">
                Help us understand where you are on your export journey.
              </p>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="mb-2.5 block text-[13px] font-medium text-text-body">
                    Do you have an IEC (Import Export Code)?
                  </label>
                  <Toggle
                    value={hasIEC}
                    onChange={setHasIEC}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                  />
                </div>
                {hasIEC === "yes" && (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                      IEC Number
                    </label>
                    <Input placeholder="e.g. AABCR1234E" />
                  </div>
                )}
                <div>
                  <label className="mb-2.5 block text-[13px] font-medium text-text-body">
                    Is your AD Code registered with customs?
                  </label>
                  <Toggle
                    value="yes"
                    onChange={() => {}}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                      { value: "unsure", label: "Not sure" },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-[13px] font-medium text-text-body">
                    Have you exported before?
                  </label>
                  <Toggle
                    value={exported}
                    onChange={setExported}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No, first time" },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-body">
                    Tell us about your export experience (optional)
                  </label>
                  <textarea
                    placeholder="Any markets you've sold to, challenges you've faced..."
                    className="min-h-[90px] w-full resize-y rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-text-body outline-none transition-colors focus:border-action-blue focus:ring-3 focus:ring-action-blue/10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 3 && (
            <div className="animate-fade-reveal">
              <h2 className="mb-1.5 text-xl font-extrabold text-text-heading">
                Step 4: Documents
              </h2>
              <p className="mb-7 text-sm text-text-secondary">
                Upload your key documents. We&apos;ll verify them within 24 hours.
              </p>
              <div className="flex flex-col gap-3.5">
                {[
                  "GST Certificate",
                  "Udyam Certificate",
                  "Product Catalogue / Brochure",
                  "Certifications",
                ].map((d) => (
                  <UploadZone
                    key={d}
                    label={d}
                    uploaded={!!uploads[d]}
                    onUpload={() => setUploads({ ...uploads, [d]: true })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="outline" onClick={back}>
                Back
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Save Draft
              </Button>
            )}
            <Button onClick={next}>
              {step === 0 && "Next: Product Catalogue"}
              {step === 1 && "Next: Export Readiness"}
              {step === 2 && "Next: Documents"}
              {step === 3 && "Complete Setup"}
              {step < 3 ? (
                <ArrowRight size={16} />
              ) : (
                <Check size={16} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
