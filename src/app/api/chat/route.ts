import { NextResponse } from "next/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { rateLimit, refundRateLimit, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { runSaathi, type SaathiContext } from "@/lib/saathi/agent";
import { createSaathiClient } from "@/lib/saathi/model";

// Ensure this route is always evaluated at request time, never during the
// static build's page-data collection (which has no env vars).
export const dynamic = "force-dynamic";

// Guardrails: keep costs and abuse in check.
const MAX_MESSAGE_CHARS = 1000; // one long paragraph, ~250 tokens
const MAX_HISTORY = 12; // trailing turns kept as context

// A coarse per-IP guard sits in front of everything, purely to bounce floods
// before they reach Supabase auth or the model.
const IP_RATE_LIMIT = { scope: "chat-ip", limit: 30, windowMs: 60_000 };

// Signed-in manufacturers: the per-USER limit is the real throttle.
const USER_RATE_LIMIT = { scope: "chat-user", limit: 8, windowMs: 60_000 };

/**
 * ANONYMOUS ACCESS — a hard volume cap, not a rate cap.
 *
 * Saathi used to be signed-in only, which meant the one thing that
 * distinguishes this product from a database with a search box was invisible
 * to anyone evaluating it. A visitor saw tariff tables and had to take the
 * agent on trust.
 *
 * So anonymous traffic gets a real conversation — every tool, the same model,
 * the same grounding — but a fixed number of questions per IP per day rather
 * than a per-minute rate. A rate limit would let a scraper draw an unbounded
 * amount of model time slowly; a volume cap will not. Six is enough to ask a
 * product question, watch the tools fire and see the answer cite its source,
 * and far too few to use as a free product.
 *
 * In-memory and per-instance (see rate-limit.ts), so a determined abuser on a
 * multi-instance deploy gets somewhat more than six. That is an accepted
 * trade: the cost ceiling per instance is still small, and the alternative is
 * a Redis dependency for a widget.
 */
const ANON_DAILY_CAP = { scope: "chat-anon", limit: 6, windowMs: 24 * 60 * 60_000 };

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
 * personalize. Only called when there IS a user — anonymous callers get an
 * empty context, which the agent already handles: it simply has no company or
 * catalogue to reason about and asks for the product instead.
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
  // Held outside the try so the catch below can hand the question back if the
  // model never answered. Only set for anonymous callers.
  let anonIpToRefund: string | null = null;

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Anonymous visitors get a capped trial; signed-in manufacturers get the
    // per-user throttle. The key never leaves the server in either case.
    let anonRemaining: number | null = null;

    if (user) {
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
    } else {
      const anonRl = rateLimit(clientIp(request), ANON_DAILY_CAP);
      if (!anonRl.ok) {
        // Not a generic 429: the visitor has used the trial, and the next step
        // is an account, not waiting. Say which.
        return NextResponse.json(
          {
            error:
              "That's all " +
              ANON_DAILY_CAP.limit +
              " free questions for today. Create an account — it's free — and Saathi will also know your products and answer about them directly.",
            signUpRequired: true,
          },
          { status: 429, headers: { "Retry-After": String(Math.ceil(anonRl.resetInMs / 1000)) } }
        );
      }
      anonRemaining = anonRl.remaining;
      anonIpToRefund = clientIp(request);
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

    const ctx: SaathiContext = user
      ? await loadContext(supabase, user, language)
      : { language };
    const result = await runSaathi(client, history, ctx);
    // An answer exists, so the question is genuinely spent.
    anonIpToRefund = null;

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
      // Only present for anonymous callers, so the widget can count down
      // honestly instead of guessing client-side — a client-side counter is
      // both bypassable and, worse, wrong after a refresh.
      ...(anonRemaining !== null ? { anonRemaining } : {}),
    });
  } catch (error) {
    console.error("Saathi error:", error);

    // The visitor asked and got nothing back — usually the model provider
    // returning 503. Hand the question back rather than charging them for an
    // outage that was not theirs.
    if (anonIpToRefund) refundRateLimit(anonIpToRefund, ANON_DAILY_CAP);

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
