/**
 * The model behind Export Saathi.
 *
 * Saathi runs on Google Gemini 2.5 Flash — fast, cheap, strongly multilingual
 * (it handles Hindi/Marathi/Gujarati natively, which the old llama model on
 * Groq did not), and capable at the multi-step tool reasoning the agent loop
 * depends on.
 *
 * WHY THE CLIENT IS A `Groq` INSTANCE THAT NEVER TALKS TO GROQ
 * Gemini exposes an OpenAI-compatible surface at /v1beta/openai that speaks the
 * exact same Chat Completions dialect the agent already uses — `tools`,
 * `tool_calls`, `tool`-role messages, `temperature`, `frequency_penalty`,
 * `tool_choice`. The `groq-sdk` client in this repo IS an OpenAI-compatible
 * HTTP client (a Stainless-generated OpenAI SDK fork), so pointing its
 * `baseURL` at Gemini lets the entire, carefully-tuned loop in agent.ts run
 * unchanged against Gemini instead of Groq. We reuse it here purely as that
 * generic transport — no new dependency, one place to swap providers.
 *
 * Access to this model is gated in the /api/chat route: signed-in users only,
 * behind a tight per-user rate limit, so the key can't be drained by anonymous
 * traffic on the public site.
 */

import { Groq } from "groq-sdk";

/** Gemini model id, as the OpenAI-compatible endpoint expects it (no `models/`). */
export const SAATHI_MODEL = "gemini-2.5-flash";

// No trailing slash: the client appends `/chat/completions`, and Gemini rejects
// the `//` a trailing slash would produce.
const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Build the OpenAI-compatible client Saathi runs on, pointed at Gemini.
 * `apiKey` must be the Google AI Studio / Gemini API key (GEMINI_API_KEY).
 */
export function createSaathiClient(apiKey: string): Groq {
  return new Groq({ apiKey, baseURL: GEMINI_OPENAI_BASE_URL });
}
