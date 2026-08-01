import { NextResponse } from "next/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { runSaathi, type SaathiContext } from "@/lib/saathi/agent";
import { createSaathiClient } from "@/lib/saathi/model";

// Ensure this route is always evaluated at request time, never during the
// static build's page-data collection (which has no env vars).
export const dynamic = "force-dynamic";

// Guardrails: keep costs and abuse in check.
const MAX_MESSAGE_CHARS = 1000; // one long paragraph, ~250 tokens
const MAX_HISTORY = 12; // trailing turns kept as context
// Saathi runs on the Gemini key and is restricted to signed-in users, so the
// primary limit is keyed per USER and kept tight. A coarse per-IP guard sits in
// front purely to bounce anonymous floods before they reach Supabase auth.
const USER_RATE_LIMIT = { scope: "chat-user", limit: 8, windowMs: 60_000 }; // 8/min/user
const IP_RATE_LIMIT = { scope: "chat-ip", limit: 30, windowMs: 60_000 }; // 30/min/IP

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
 * personalize. The caller has already authenticated the user (the chat is
 * signed-in only), so this just enriches the context and never gates access.
 */
async function loadContext(
  supabase: SupabaseClient,
  user: User,
  language?: string | null
): Promise<SaathiContext> {
  try {
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
    // Coarse per-IP guard FIRST, before any parsing or Supabase call, so a
    // flood of empty/anonymous POSTs bounces cheaply.
    const ipRl = rateLimit(clientIp(request), IP_RATE_LIMIT);
    if (!ipRl.ok) {
      return NextResponse.json(
        { error: "Too many messages. Please slow down and try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(ipRl.resetInMs / 1000)) },
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

    // Saathi is restricted to signed-in manufacturers — the Gemini key must not
    // be reachable by anonymous traffic on the public site.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Please sign in to use Export Saathi. It's free — create an account to start asking about your export markets.",
        },
        { status: 401 }
      );
    }

    // Tight per-user limit is the real throttle on Gemini usage.
    const userRl = rateLimit(user.id, USER_RATE_LIMIT);
    if (!userRl.ok) {
      return NextResponse.json(
        { error: "You're sending messages very quickly. Please wait a moment and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(userRl.resetInMs / 1000)),
            "X-RateLimit-Limit": String(USER_RATE_LIMIT.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
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

    // Instantiate the client lazily, INSIDE the handler — the SDK throws in its
    // constructor when the key is missing, so creating it at module scope
    // crashed the production build. Now it only runs at request time.
    const client = createSaathiClient(process.env.GEMINI_API_KEY);

    const ctx = await loadContext(supabase, user, language);
    const result = await runSaathi(client, history, ctx);

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
    // surface something actionable instead of a bare 500. (Gemini returns 429
    // for both per-minute rate limits and the daily quota.)
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
