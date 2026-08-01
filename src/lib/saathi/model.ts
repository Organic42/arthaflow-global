/**
 * The model behind Export Saathi.
 *
 * Saathi runs on Google Gemini 3.5 Flash — fast, cheap, strongly multilingual
 * (it handles Hindi/Marathi/Gujarati natively, which the old llama model on
 * Groq did not), and capable at the multi-step tool reasoning the agent loop
 * depends on. (2.5 Flash is no longer offered to new API projects; 3.5 Flash
 * is both the newer and the currently available choice.)
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

/** Gemini model id, as the OpenAI-compatible endpoint expects it (no `models/`). */
export const SAATHI_MODEL = "gemini-3.5-flash";

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
