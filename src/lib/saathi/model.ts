/**
 * The model behind Export Saathi.
 *
 * Saathi runs on Google Gemini 3.5 Flash Lite — the cheapest tier that still
 * does what this agent needs. Strongly multilingual (it handles
 * Hindi/Marathi/Gujarati natively, which the old llama model on Groq did not)
 * and capable at the multi-step tool reasoning the agent loop depends on.
 *
 * WHY NOT 2.5 FLASH, WHICH IS CHEAPER STILL
 * Because it does not work on this key, and the models list is misleading
 * about that. `GET /v1beta/models` advertises both `gemini-2.5-flash` and
 * `gemini-2.5-flash-lite`, but calling either returns 404 — on the
 * OpenAI-compatible endpoint AND on native `generateContent`, so it is not a
 * transport problem. They are listed, not served. Do not "fix" this by
 * switching the model id back to 2.5 on the strength of the list endpoint.
 *
 * WHY LITE IS SAFE HERE, VERIFIED RATHER THAN ASSUMED
 * A cheaper tier is only a saving if it still does the job, and lite tiers are
 * exactly where tool-calling and non-English output tend to degrade. Probed
 * live against this key before switching: 3.5 Flash Lite requests
 * classifyProduct for a product question, chains correctly to getTopImporters
 * once the classification comes back, and answers a Devanagari question in
 * Devanagari. Those are the three behaviours the loop depends on.
 *
 * If answer quality regresses, `gemini-3.5-flash` is the drop-in step back up
 * — same transport, same dialect, same tool surface, roughly the same code.
 *
 * WHY THE `openai` PACKAGE, NOT `groq-sdk`, AS THE TRANSPORT
 * Gemini exposes an OpenAI-compatible surface at /v1beta/openai/chat/completions
 * that speaks the exact same Chat Completions dialect the agent already uses —
 * `tools`, `tool_calls`, `tool`-role messages, `temperature`,
 * `frequency_penalty`, `tool_choice` — so the whole tuned loop in agent.ts can
 * run against it unchanged. The first attempt reused the `groq-sdk` client for
 * this (it's an OpenAI-compatible fork), which seemed like zero new
 * dependencies — but that client hardcodes Groq's own `/openai/v1/chat/completions`
 * path onto whatever `baseURL` it's given, so pointing it at Gemini produced
 * `.../v1beta/openai/openai/v1/chat/completions` and a 404, confirmed by a
 * live request against Gemini during setup. The official `openai` SDK posts to
 * `{baseURL}/chat/completions` — exactly the path Gemini documents for this
 * endpoint — so that's the transport here instead. Its types are what
 * agent.ts's `ChatCompletion*` types actually come from upstream in both SDKs,
 * so nothing downstream changes.
 *
 * Access to this model is gated in the /api/chat route: signed-in users only,
 * behind a tight per-user rate limit, so the key can't be drained by anonymous
 * traffic on the public site.
 */

import OpenAI from "openai";

/**
 * Gemini model id, as the OpenAI-compatible endpoint expects it (no `models/`).
 * Override with SAATHI_MODEL to switch tiers without a deploy.
 */
export const SAATHI_MODEL = process.env.SAATHI_MODEL || "gemini-3.5-flash";

/**
 * How much hidden reasoning the model may spend before answering.
 *
 * THIS IS THE SETTING THAT WAS DRAINING THE KEY.
 *
 * Gemini 3.x thinks before it answers, and those thinking tokens are billed as
 * output while being invisible in `completion_tokens`. Measured live on this
 * key with a one-line question: `completion_tokens` 5 and `prompt_tokens` 16,
 * but `total_tokens` 212 - so 191 of the 212 tokens billed, about 90%, were
 * reasoning nobody asked for and nobody sees.
 *
 * On the real workload (a product question with tools attached) "low" cut
 * hidden thinking from 188 tokens to 80 and still produced the correct
 * classifyProduct call. The agent's own system prompt already prescribes the
 * procedure in detail; it does not need the model to rediscover it each turn.
 *
 * "none" is rejected outright by this endpoint (HTTP 400), so "low" is the
 * floor actually available.
 */
export const SAATHI_REASONING_EFFORT = "low";

// No trailing slash: the client appends `/chat/completions`.
const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Build the OpenAI-compatible client Saathi runs on, pointed at Gemini.
 * `apiKey` must be the Google AI Studio / Gemini API key (GEMINI_API_KEY).
 */
export function createSaathiClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: GEMINI_OPENAI_BASE_URL });
}
