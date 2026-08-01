/**
 * Language enforcement for Saathi.
 *
 * WHY THIS IS CODE AND NOT A PROMPT RULE
 * The system prompt already tells the model to reply in the user's language.
 * Measured against the live endpoint, a Hindi question came back in Hindi once
 * in five attempts. The rule is third of twenty-one in an 8,000-character
 * prompt, and the last thing the model reads before generating is a STYLE rule
 * whose examples are all English.
 *
 * Multilingual support is not a nice-to-have here — it is the reason a
 * manufacturer who runs their business in Marathi can use this at all, and it
 * is claimed in every piece of ArthaFlow's marketing. A feature that works 20%
 * of the time is worse than one that does not exist, because it looks like it
 * works when you demo it.
 *
 * So we detect the mismatch and retry once with an instruction the model cannot
 * miss. Deterministic, cheap (it only fires on failure), and testable without
 * touching the API.
 */

/** Scripts we can distinguish. "other" means we will not enforce anything. */
export type Script = "devanagari" | "latin" | "other";

// Devanagari covers Hindi and Marathi, the two languages our pilots use.
const DEVANAGARI = /[ऀ-ॿ]/;
const LATIN = /[A-Za-z]/;

/**
 * Count only letters. Digits, currency, punctuation and whitespace say nothing
 * about language, and a Hindi answer is full of them — HS codes, dollar
 * figures, percentages.
 */
function letterCounts(text: string): { deva: number; latin: number } {
  let deva = 0;
  let latin = 0;
  for (const ch of text) {
    if (DEVANAGARI.test(ch)) deva++;
    else if (LATIN.test(ch)) latin++;
  }
  return { deva, latin };
}

/**
 * Which script a piece of text is written in.
 *
 * A low bar for Devanagari on purpose: "मुझे HS code चाहिए" is a Hindi question
 * even though most of its letters are Latin, and treating it as English would
 * be the exact failure we are fixing.
 */
export function detectScript(text: string): Script {
  const { deva, latin } = letterCounts(text);
  if (deva === 0 && latin === 0) return "other";
  if (deva === 0) return "latin";
  // Any meaningful Devanagari presence means the user wrote in an Indic script.
  if (deva >= 3 || deva / (deva + latin) > 0.15) return "devanagari";
  return "latin";
}

/**
 * Does the reply answer in the script the user wrote in?
 *
 * Only enforced for Devanagari input. We do not police the reverse: an English
 * question answered in English is the overwhelmingly common case, and a user
 * who writes English but wants Hindi will ask.
 */
export function replyMatchesInput(userText: string, replyText: string): boolean {
  if (detectScript(userText) !== "devanagari") return true;
  if (!replyText.trim()) return true;

  const { deva, latin } = letterCounts(replyText);
  if (deva + latin === 0) return true;

  // A genuine Hindi answer still carries Latin — country names, HS codes,
  // "FOB", "RoDTEP". A quarter Devanagari by letter count separates a Hindi
  // answer with English terms in it from an English answer outright.
  return deva / (deva + latin) >= 0.25;
}

/**
 * The nudge appended when the model answered in the wrong language.
 *
 * Deliberately short and last. The failure is one rule losing to twenty others
 * over eight thousand characters, so the correction has to be the final thing
 * the model reads and has to say one thing only.
 */
export const LANGUAGE_RETRY_INSTRUCTION =
  "STOP. Your previous answer was in the wrong language. The user wrote in " +
  "Devanagari (Hindi or Marathi). Write your ENTIRE answer in Devanagari script. " +
  "Do not reply in English. Keep HS codes, country names, currency figures and " +
  "percentages exactly as they are — only the surrounding prose changes language. " +
  "Do not apologise or mention this instruction; just answer in the correct language.";

/**
 * Detects the degenerate output seen when the model loops on Devanagari — 4,700
 * characters built from a handful of distinct symbols. Rare, but it renders as
 * a wall of garbage, so it is worth catching alongside the language check.
 */
export function isDegenerate(text: string): boolean {
  if (text.length < 1500) return false;
  const distinct = new Set(text.replace(/\s/g, "")).size;
  return distinct < 40;
}
