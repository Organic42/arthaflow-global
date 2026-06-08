import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";

// Ensure this route is always evaluated at request time, never during the
// static build's page-data collection (which has no env vars).
export const dynamic = "force-dynamic";

// System prompt to give context about ArthaFlow
const SYSTEM_PROMPT = `
You are the ArthaFlow Assistant, an AI helper for the ArthaFlow export platform.
You have deep knowledge about:

1. ArthaFlow Platform:
   - AI-powered export infrastructure for Indian manufacturers
   - Helps export products to 50+ countries
   - Features: AI document generation, buyer matching, logistics orchestration, compliance tracking
   - Solves documentation nightmare, no buyer access, logistics overwhelm
   - 4-step process: Onboard business, AI generates documents, find buyers & ship, get paid in dollars

2. Key Features:
   - AI Document Generator: Product sheets, HS codes, proforma invoices in 30 seconds
   - Export Readiness Score: Gamified 100-point compliance score
   - Buyer Matching: Curated international buyer connections
   - Logistics Orchestration: Freight quotes, customs, insurance through partner network
   - Document Vault: Secure cloud storage for certificates and licenses
   - Compliance Tracker: IEC registration, AD code setup, DGFT guidance

3. Target Audience:
   - Indian manufacturers (especially MSMEs)
   - Looking to export globally without overhead
   - Need help with documentation, finding buyers, logistics

4. Brand Colors & Tone:
   - Professional yet approachable
   - Use ArthaFlow's brand voice: confident, helpful, knowledgeable
   - Reference the navy (#0B1D3A) and artha-gold (#D4A843) colors when relevant

Keep responses concise, helpful, and focused on export-related queries. If asked about something outside your knowledge base, politely say you're specialized in export assistance and suggest contacting support for other inquiries.
`;

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    // Instantiate the client lazily, INSIDE the handler — the Groq SDK throws
    // in its constructor when the key is missing, so creating it at module
    // scope crashed the production build. Now it only runs at request time.
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Call Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      model: "llama-3.1-8b-instant", // or another suitable model
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    const response = chatCompletion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Groq API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}