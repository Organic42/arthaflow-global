import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Each document call is an LLM invocation — hard cap generosity here.
// 20/hr matches the Starter tier ceiling (3/mo x margin) and stops one
// user with a script from burning your Groq quota.
const RATE_LIMIT = { scope: "gendoc", limit: 20, windowMs: 60 * 60_000 };

// ── Document type definitions ────────────────────────────────────────────────

const DOC_TYPES = {
  product_export_sheet: {
    label: "Product Export Sheet",
    category: "product",
    instructions: `Create a professional, buyer-facing PRODUCT EXPORT SHEET that an international
buyer (importer/distributor) would read to evaluate this Indian manufacturer's product.
Sections to include (in this order):
1. "Product Overview" (type "text") — 2-3 sentence compelling description of the product and its applications.
2. "Specifications" (type "kv") — HS code, materials/grade if inferable, MOQ, lead time, production capacity, certifications. Use "Not specified" only when truly unknown.
3. "Quality & Compliance" (type "list") — 3-5 bullet points on certifications held, quality processes, and export-readiness.
4. "Commercial Terms" (type "kv") — MOQ, lead time, suggested Incoterms (EXW/FOB typical for Indian MSMEs), payment terms suggestion (e.g. 30% advance, 70% against BL copy).
5. "About the Manufacturer" (type "text") — 2-3 sentences introducing the company professionally using the profile data.`,
  },
  hs_classification: {
    label: "HS Code Classification",
    category: "export",
    instructions: `Create an HS CODE CLASSIFICATION REPORT for Indian customs (ITC-HS, 8-digit).
Sections to include (in this order):
1. "Classification Summary" (type "kv") — Recommended 8-digit ITC-HS code, Chapter, Heading, Sub-heading, India tariff item. If the product already has an HS code, validate and extend it to 8 digits.
2. "Classification Rationale" (type "text") — Explain WHY this code applies: product nature, material, function, and the General Rules of Interpretation logic. 3-4 sentences.
3. "Duty & Scheme Implications" (type "kv") — Typical BCD %, IGST %, RoDTEP eligibility (state "Verify current rate on DGFT portal" where rates change), export incentive schemes that may apply.
4. "Compliance Notes" (type "list") — 3-5 bullets: documents needed at customs for this chapter, any licensing/restrictions typical for this category, common classification mistakes to avoid.
IMPORTANT: Where exact current duty rates are uncertain, give the typical range and explicitly say to verify on the DGFT/CBIC portal. Never invent precise rates as fact.`,
  },
  proforma_invoice: {
    label: "Proforma Invoice",
    category: "export",
    instructions: `Create a PROFORMA INVOICE template pre-filled with the manufacturer's and product's data.
Sections to include (in this order):
1. "Exporter Details" (type "kv") — Company name, contact, GST number, IEC number (use profile data; "________" for missing fields the user must fill).
2. "Buyer Details" (type "kv") — All fields as "________" placeholders (Consignee name, Address, Country, Contact).
3. "Shipment Details" (type "kv") — Port of loading "________", Port of discharge "________", Incoterms (suggest FOB), Payment terms (suggest 30% advance / 70% against BL), Currency (USD).
4. "Goods Description" (type "kv") — Product name, HS code, Quantity "________", Unit price (USD) "________", Total "________".
5. "Declarations" (type "list") — Standard proforma declarations: country of origin India, validity period of quote (30 days), prices subject to confirmation, this is not a tax invoice.`,
  },
} as const;

type DocType = keyof typeof DOC_TYPES;

// ── The shared output schema every doc type renders into ────────────────────

const OUTPUT_FORMAT = `Respond with ONLY valid JSON in exactly this shape:
{
  "title": "string — document title (usually the product name)",
  "subtitle": "string — the company / context line",
  "reference": "string — a document reference like AF-EXP-2026-XXXX (generate a plausible one)",
  "sections": [
    { "heading": "string", "type": "kv", "rows": [ { "label": "string", "value": "string" } ] },
    { "heading": "string", "type": "text", "body": "string" },
    { "heading": "string", "type": "list", "items": [ "string" ] }
  ],
  "footer": "string — one-line professional footer note"
}
Each section must use one of the three types shown ("kv", "text", "list").
Ground every fact in the provided data. Be professional and concise. No markdown.`;

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { productId, docType } = (await request.json()) as {
      productId?: string;
      docType?: string;
    };

    if (!productId || !docType || !(docType in DOC_TYPES)) {
      return NextResponse.json(
        { error: "productId and a valid docType are required" },
        { status: 400 }
      );
    }
    const typed = docType as DocType;

    // Auth first — RLS scopes all queries to this user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Per-user rate limit — auth means we can bucket by user id, not IP,
    // so a shared office network isn't unfairly throttled.
    const rl = rateLimit(user.id, RATE_LIMIT);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: `You've hit the hourly document limit. Try again in ${Math.ceil(
            rl.resetInMs / 60_000
          )} minutes, or upgrade your plan for higher limits.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rl.resetInMs / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMIT.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    // Fetch the real product + profile that ground the generation
    const [{ data: product }, { data: profile }] = await Promise.all([
      supabase.from("products").select("*").eq("id", productId).single(),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const def = DOC_TYPES[typed];

    const context = `
MANUFACTURER PROFILE:
- Business name: ${profile?.business_name || "Not specified"}
- Contact person: ${profile?.full_name || "Not specified"}
- Phone: ${profile?.contact_phone || "Not specified"}
- GST number: ${profile?.gst_number || "Not specified"}
- IEC number: ${profile?.iec_number || (profile?.has_iec ? "Held (number on file)" : "Not yet obtained")}
- Year established: ${profile?.year_established || "Not specified"}
- Annual turnover: ${profile?.annual_turnover || "Not specified"}
- Export experience: ${profile?.export_experience || (profile?.has_exported ? "Has exported before" : "First-time exporter")}

PRODUCT:
- Name: ${product.name}
- Description: ${product.description || "Not specified"}
- HS code (as entered): ${product.hs_code || "Not specified"}
- Production capacity: ${product.production_capacity || "Not specified"}
- MOQ: ${product.moq || "Not specified"}
- Lead time: ${product.lead_time || "Not specified"}
- Certifications: ${product.certifications?.length ? product.certifications.join(", ") : "None listed"}

TODAY'S DATE: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;

    // Lazy client — never instantiate at module scope (build-time crash)
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are ArthaFlow's export documentation engine for Indian MSME manufacturers. You produce accurate, professional export documents grounded ONLY in the data provided. ${OUTPUT_FORMAT}`,
        },
        {
          role: "user",
          content: `${def.instructions}\n\n${context}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "AI returned no content" },
        { status: 502 }
      );
    }

    let content;
    try {
      content = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 502 }
      );
    }
    if (!content?.title || !Array.isArray(content?.sections)) {
      return NextResponse.json(
        { error: "AI response missing required fields" },
        { status: 502 }
      );
    }

    // Save to the document vault
    const docName = `${def.label} — ${product.name}`;
    const { data: saved, error: saveError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        name: docName,
        category: def.category,
        status: "ai_generated",
        ai_generated: true,
        doc_type: typed,
        product_id: product.id,
        content,
      })
      .select()
      .single();

    if (saveError) {
      // Generation succeeded but save failed (e.g. migration 004 not run yet) —
      // still return the document so the user isn't blocked.
      console.error("Document save failed:", saveError.message);
      return NextResponse.json({ document: { name: docName, doc_type: typed, content }, saved: false });
    }

    // Activity feed entry (best-effort)
    await supabase.from("activity_log").insert({
      user_id: user.id,
      badge: "DOC",
      badge_color: "blue",
      text: `AI generated: ${docName}`,
      link_to: "/documents",
    });

    return NextResponse.json({ document: saved, saved: true });
  } catch (error) {
    console.error("Generate document error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
