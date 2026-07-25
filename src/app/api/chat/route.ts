import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { runSaathi, type SaathiContext } from "@/lib/saathi/agent";

// Ensure this route is always evaluated at request time, never during the
// static build's page-data collection (which has no env vars).
export const dynamic = "force-dynamic";

// Guardrails: keep costs and abuse in check.
const MAX_MESSAGE_CHARS = 1000; // one long paragraph, ~250 tokens
const MAX_HISTORY = 12; // trailing turns kept as context
const RATE_LIMIT = { scope: "chat", limit: 15, windowMs: 60_000 }; // 15/min/IP

type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Normalize the request body into a conversation history whose last entry is
 * the newest user message. Accepts either:
 *   { messages: [{role, content}, ...] }   (multi-turn — preferred)
 *   { message: "..." }                      (single-turn — backward compatible)
 */
function parseHistory(body: unknown): ChatTurn[] | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { messages?: unknown; message?: unknown };

  if (Array.isArray(b.messages)) {
    const turns: ChatTurn[] = [];
    for (const m of b.messages) {
      if (!m || typeof m !== "object") continue;
      const role = (m as { role?: unknown }).role;
      const content = (m as { content?: unknown }).content;
      if (
        (role === "user" || role === "assistant") &&
        typeof content === "string" &&
        content.trim()
      ) {
        turns.push({ role, content: content.trim() });
      }
    }
    return turns.length ? turns.slice(-MAX_HISTORY) : null;
  }

  if (typeof b.message === "string" && b.message.trim()) {
    return [{ role: "user", content: b.message.trim() }];
  }

  return null;
}

/**
 * Load the signed-in manufacturer's profile + products so Saathi can
 * personalize. Anonymous callers (public site widget) get an empty context —
 * Saathi still works, just without the "your catalogue" reasoning.
 */
async function loadContext(language?: string | null): Promise<SaathiContext> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { language };

    const [{ data: profile }, { data: products }] = await Promise.all([
      supabase
        .from("profiles")
        .select("business_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("products")
        .select("name, hs_code")
        .eq("user_id", user.id)
        .limit(20),
    ]);

    return {
      language,
      companyName: profile?.business_name ?? null,
      products: (products ?? []).map((p) => ({
        name: p.name as string,
        hsCode: (p.hs_code as string | null) ?? null,
      })),
    };
  } catch {
    // Never let a context-load failure break the chat.
    return { language };
  }
}

export async function POST(request: Request) {
  try {
    // Rate limit BEFORE parsing body so a flood of empty POSTs still bounces.
    const rl = rateLimit(clientIp(request), RATE_LIMIT);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many messages. Please slow down and try again shortly." },
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

    const body = (await request.json().catch(() => null)) as unknown;
    const history = parseHistory(body);

    if (!history) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Guard the newest user message length (last entry).
    const latest = history[history.length - 1];
    if (latest.content.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        {
          error: `Message too long. Please keep it under ${MAX_MESSAGE_CHARS} characters.`,
        },
        { status: 413 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    // Optional language hint from the client (e.g. "hi" for Hindi).
    const language =
      typeof (body as { language?: unknown })?.language === "string"
        ? ((body as { language: string }).language)
        : null;

    // Instantiate the client lazily, INSIDE the handler — the Groq SDK throws
    // in its constructor when the key is missing, so creating it at module
    // scope crashed the production build. Now it only runs at request time.
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const ctx = await loadContext(language);
    const result = await runSaathi(groq, history, ctx);

    // `response` is kept for backward compatibility with the existing widget;
    // `toolCalls` exposes the structured trade data for chart rendering.
    //
    // Only successful results are surfaced. Failed ones carry internal
    // diagnostics (missing env-var names, upstream rate-limit notices) that
    // shouldn't reach the browser, and the UI has nothing to draw from them —
    // the user-facing explanation is already in `response`.
    return NextResponse.json({
      response: result.text,
      toolCalls: result.toolCalls.filter((t) => t.result.ok),
    });
  } catch (error) {
    console.error("Saathi error:", error);

    // Upstream capacity problems are not the user's fault and are temporary —
    // surface something actionable instead of a bare 500. (Groq returns 429
    // both for per-minute limits and for the daily token cap.)
    const status = (error as { status?: number } | null)?.status;
    if (status === 429 || status === 503) {
      return NextResponse.json(
        {
          error:
            "Saathi is at capacity right now. Please try again in a few minutes.",
        },
        { status: 503, headers: { "Retry-After": "120" } }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
