"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Check, MessageCircle, X, Send, RotateCcw, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TradeCharts, type TradeToolCall } from "./trade-chart";
import { MarkdownLite } from "./markdown-lite";

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: TradeToolCall[];
};

// Saathi's /api/chat endpoint now serves anonymous visitors a capped trial as
// well as signed-in manufacturers (the Gemini key must not be
// reachable by anonymous traffic — see src/app/api/chat/route.ts). Checking
// auth state here lets a logged-out visitor see a "sign in to chat" prompt
// up front instead of typing a question and getting a 401 back.
type AuthState = "loading" | "in" | "out";

// Mirrors MAX_MESSAGE_CHARS in src/app/api/chat/route.ts. Clamped here too, so
// a long paste gets an instant, honest limit instead of a 413 after a send.
const MAX_CHARS = 1000;

const GREETING =
  "Namaste! I'm Export Saathi. Tell me your product and I'll show you where the world is buying it — top markets, India's competition, and where demand is growing. What do you make?";

// Real capabilities, not generic chat filler — each maps to a tool this agent
// actually calls (classifyProduct + trade tools, getTradeTrend, GST/RoDTEP via
// getIndianTariffLines). A suggestion that can't be fulfilled is worse than none.
const STARTERS = [
  "Where can I export leather bags?",
  "Is demand growing in Germany?",
  "GST rate for cotton t-shirts",
];

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  /**
   * Free questions left, as last reported by the server. null until the first
   * anonymous reply comes back, and irrelevant once signed in.
   *
   * Deliberately server-reported rather than counted here: a client-side
   * counter is bypassable, and it goes wrong the moment someone refreshes.
   */
  const [freeLeft, setFreeLeft] = useState<number | null>(null);
  /** Set when the trial is spent, so the composer becomes a sign-up prompt. */
  const [trialSpent, setTrialSpent] = useState(false);
  /**
   * What Saathi is doing right now, streamed from the server.
   *
   * A first answer takes 75-100 seconds — the model, not the tools. A static
   * spinner for that long loses the visitor before the agent has finished
   * making its case, and the case is precisely what the steps show: real
   * lookups against real data, one after another.
   */
  const [steps, setSteps] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Track sign-in state live: a visitor can log in (or out) in this same tab —
  // e.g. via /login in another tab, or a session expiring — while the widget
  // stays mounted across the whole site.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthState(user ? "in" : "out");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session?.user ? "in" : "out");
    });
    return () => subscription.unsubscribe();
  }, []);

  // Autofocus on open, and let Escape close it — the panel behaves like any
  // other overlay for a keyboard user. hasOpened is set from the launcher's
  // own click handler, not derived here — it's a direct user action, and
  // setting it inside the effect would be a same-render setState loop.
  useEffect(() => {
    if (!isOpen) return;
    if (authState === "in") inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, authState]);

  function send(text: string) {
    const userMessage = text.trim();
    // Anonymous visitors may send until the server says the trial is spent.
    if (!userMessage || loading || authState === "loading" || trialSpent) return;

    // The greeting is a client-only intro, so it's excluded from what we send.
    const history = [
      ...messages.slice(1),
      { role: "user" as const, content: userMessage },
    ];

    setInput("");
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setSteps([]);

    (async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        });

        // Guard responses (rate limits, message too long, trial spent) are
        // still plain JSON — only a run that reaches the agent streams.
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const detail =
            body && typeof body.error === "string" ? body.error : null;
          // The trial running out is not an error to retry — it swaps the
          // composer for a sign-up prompt.
          if (body?.signUpRequired) {
            setTrialSpent(true);
            setFreeLeft(0);
          }
          throw new Error(detail || `Something went wrong (${response.status}).`);
        }

        if (!response.body) throw new Error("Connection interrupted. Please try again.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let settled = false;

        // Newline-delimited JSON. A chunk can split a line anywhere, so
        // whatever follows the last newline is held back for the next read.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let ev: {
              type?: string;
              label?: string;
              response?: string;
              toolCalls?: unknown;
              anonRemaining?: number;
              error?: string;
            };
            try {
              ev = JSON.parse(line);
            } catch {
              continue; // A malformed line is not worth failing the answer over.
            }

            if (ev.type === "progress" && ev.label) {
              // Repeats are dropped so consecutive identical phases do not
              // stack up as duplicate lines.
              setSteps((prev) =>
                prev[prev.length - 1] === ev.label ? prev : [...prev, ev.label!]
              );
            } else if (ev.type === "done") {
              settled = true;
              if (typeof ev.anonRemaining === "number") {
                setFreeLeft(ev.anonRemaining);
                if (ev.anonRemaining <= 0) setTrialSpent(true);
              }
              setMessages((prev) => [...prev, {
                role: 'assistant',
                content: ev.response || "Sorry, I couldn't generate a response.",
                toolCalls: Array.isArray(ev.toolCalls) ? ev.toolCalls : undefined,
              }]);
            } else if (ev.type === "error") {
              settled = true;
              throw new Error(ev.error || "Something went wrong. Please try again.");
            }
          }
        }

        // The stream ended without a verdict — a dropped connection mid-answer.
        if (!settled) {
          throw new Error("Connection interrupted before Saathi finished. Please try again.");
        }
      } catch (err) {
        console.error('Chat error:', err);
        const msg =
          err instanceof Error && err.message
            ? err.message
            : "Connection interrupted. Please try again.";
        // Errors surface as a message from Saathi, in Saathi's voice — not a
        // separate banner the user has to reconcile with the conversation.
        setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
      } finally {
        setLoading(false);
        setSteps([]);
      }
    })();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    send(input);
  }

  function newChat() {
    setMessages([{ role: 'assistant', content: GREETING }]);
    setInput("");
    inputRef.current?.focus();
  }

  const remaining = MAX_CHARS - input.length;
  const showCounter = remaining <= 200;
  const canReset = messages.length > 1;

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => {
          setIsOpen((v) => !v);
          setHasOpened(true);
        }}
        className={`fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full border border-artha-gold/40 bg-navy shadow-lg transition-all duration-300 hover:scale-105 hover:border-artha-gold hover:shadow-[0_8px_28px_rgba(212,168,67,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold ${
          isOpen ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
        aria-label="Open Export Saathi chat"
        aria-expanded={isOpen}
      >
        <MessageCircle size={24} strokeWidth={1.75} className="text-artha-gold" />
        {/* One unread-style affordance, not four stacked effects — and it
            retires after the first open rather than pulsing forever. */}
        {!hasOpened && (
          <span className="absolute right-1 top-1" aria-hidden>
            <span className="motion-safe:absolute motion-safe:inset-0 motion-safe:h-2.5 motion-safe:w-2.5 motion-safe:animate-ping motion-safe:rounded-full motion-safe:bg-artha-gold motion-safe:opacity-75" />
            <span className="relative block h-2.5 w-2.5 rounded-full bg-artha-gold" />
          </span>
        )}
      </button>

      {/* Panel: full-screen sheet on mobile, floating card from sm: up */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Export Saathi chat"
        className={`fixed inset-0 z-50 flex flex-col bg-navy transition-all duration-300 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:w-[400px] sm:origin-bottom-right sm:rounded-2xl sm:border sm:border-white/10 sm:bg-navy/95 sm:shadow-2xl sm:backdrop-blur-xl ${
          isOpen
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "pointer-events-none translate-y-6 opacity-0 sm:translate-y-8 sm:scale-90"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-artha-gold/15 text-artha-gold">
              <MessageCircle size={17} />
            </div>
            <div>
              <h3 className="font-bold tracking-wide text-white">Export Saathi</h3>
              <p className="text-[11px] text-white/60">Trade intelligence advisor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canReset && (
              <button
                onClick={newChat}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
                aria-label="Start a new conversation"
                title="New chat"
              >
                <RotateCcw size={17} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
              aria-label="Close chat"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* History */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm [&_p+p]:mt-2 ${
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-gradient-to-br from-artha-gold to-yellow-600 font-medium text-navy'
                    : 'rounded-bl-sm border border-white/10 bg-white/5 text-white/90'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownLite text={msg.content} />
                ) : (
                  msg.content
                )}
                {msg.role === 'assistant' && <TradeCharts toolCalls={msg.toolCalls} />}
              </div>
            </div>
          ))}

          {/* Quick starters — real capabilities, shown only before the first
              question so they read as an invitation, not clutter later on. */}
          {messages.length === 1 && authState !== "loading" && !loading && (
            <div className="flex flex-col items-start gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-left text-[12.5px] text-white/75 transition-colors hover:border-artha-gold hover:text-artha-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex w-full justify-start motion-safe:animate-in motion-safe:fade-in">
              <div
                className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-[13px]"
                aria-live="polite"
              >
                {/* Completed steps stay on screen while the answer is being
                    assembled. They are the record of what was actually
                    consulted, which is the point worth showing. */}
                {steps.slice(0, -1).map((label, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/45">
                    <Check size={12} className="shrink-0 text-[#34D399]" strokeWidth={3} />
                    {label}
                  </div>
                ))}
                <div className="flex items-center gap-2.5 text-white/70">
                  <span className="flex items-center gap-1" aria-hidden>
                    <span className="h-1.5 w-1.5 rounded-full bg-artha-gold motion-safe:animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-artha-gold motion-safe:animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-artha-gold motion-safe:animate-bounce" />
                  </span>
                  {steps[steps.length - 1] ?? "Looking this up…"}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 bg-white/5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {trialSpent ? (
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-artha-gold px-5 py-3.5 text-sm font-semibold text-navy transition-transform hover:scale-[1.02]"
            >
              <LogIn size={16} />
              Create a free account to keep going
            </Link>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Where can I export leather bags?"
                  disabled={loading || authState === "loading"}
                  maxLength={MAX_CHARS}
                  className="h-12 w-full rounded-full border border-white/10 bg-navy px-5 pr-12 text-sm text-white placeholder-white/45 shadow-inner outline-none transition-all focus:border-artha-gold/60 focus:ring-2 focus:ring-artha-gold/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || authState === "loading"}
                  className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-artha-gold text-navy transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send size={15} className="ml-0.5" />
                </button>
              </div>
              {/* One footer line carries both counters: the trial allowance on
                  the left, the character count on the right. Anonymous
                  visitors need to know the trial is finite before it ends, or
                  the sign-up prompt arrives as an interruption. */}
              {(showCounter || freeLeft !== null) && (
                <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[11px]">
                  <span className="text-white/50">
                    {freeLeft !== null && (
                      <>
                        {freeLeft} free {freeLeft === 1 ? "question" : "questions"} left ·{" "}
                        <Link href="/login" className="text-artha-gold hover:underline">
                          sign up for unlimited
                        </Link>
                      </>
                    )}
                  </span>
                  <span className={remaining <= 0 ? "text-[#FCA5A5]" : "text-white/50"}>
                    {showCounter ? `${remaining} characters left` : ""}
                  </span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
