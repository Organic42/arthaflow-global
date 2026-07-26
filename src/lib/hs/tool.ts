/**
 * Saathi-callable HS classification tool.
 *
 * Returns a SHORTLIST, never a verdict. The model picks from what comes back
 * and may not name a code that isn't here — that is the whole point: it stops
 * HS codes being recalled from training memory, where the same product got
 * 4202, 420222, 4201 and 4102 on different runs.
 */

import { searchHsCodes, lookupHsCode, type HsCandidate } from "./classify";

export interface ClassifyProductArgs {
  /** Free-text product description, e.g. "leather handbags for women". */
  description: string;
  /** How many candidates to return. Default 8. */
  limit?: number;
}

export interface ClassifyProductData {
  query: string;
  candidates: HsCandidate[];
}

export interface LookupHsArgs {
  code: string;
}

type Ok<T> = { ok: true; data: T; narrative: string; cached: boolean };
type Err = { ok: false; error: string; narrative: string };
export type HsToolResult<T> = Ok<T> | Err;

export function classifyProduct(
  args: ClassifyProductArgs
): HsToolResult<ClassifyProductData> {
  const description = String(args?.description ?? "").trim();
  if (!description) {
    return {
      ok: false,
      error: "No description supplied.",
      narrative: "I need a product description to look up an HS code.",
    };
  }

  const candidates = searchHsCodes(description, {
    limit: Math.min(Math.max(args.limit ?? 8, 1), 20),
  });

  if (candidates.length === 0) {
    return {
      ok: false,
      error: "No matching HS codes.",
      narrative:
        `I could not match "${description}" to any HS code. Ask the user to describe the ` +
        `product in different words — the material it is made of and what it is used for ` +
        `are the most useful details.`,
    };
  }

  const narrative =
    `Candidate HS codes for "${description}" (HS 2022, 6-digit international): ` +
    candidates
      .map((c) => `${c.code} — ${c.description}`)
      .join(" | ") +
    ". Choose the single best match from THIS list, or say none fit.";

  return {
    ok: true,
    cached: true, // served from bundled data; no upstream call
    narrative,
    data: { query: description, candidates },
  };
}

export function lookupHs(args: LookupHsArgs): HsToolResult<{ code: string; description: string; path: string; level: number }> {
  const found = lookupHsCode(String(args?.code ?? ""));
  if (!found) {
    return {
      ok: false,
      error: "Unknown HS code.",
      narrative: `That HS code does not exist in the HS 2022 nomenclature.`,
    };
  }
  return {
    ok: true,
    cached: true,
    narrative: `HS ${found.code} is "${found.description}" (${found.path}).`,
    data: found,
  };
}

/** Schemas advertised to the model. */
export const HS_TOOLS = [
  {
    name: "classifyProduct",
    description:
      "Find the correct HS code for a product from its description. ALWAYS call this before any trade-data tool when the user names a product rather than a code. Returns a shortlist of real HS codes to choose from — you may not use a code that is not in the result.",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description:
            "The product in plain words, including material and use, e.g. 'leather handbags' or 'brass fittings for doors'.",
        },
        limit: { type: "number", description: "Optional. Default 8." },
      },
      required: ["description"],
    },
  },
  {
    name: "lookupHs",
    description:
      "Check that an HS code exists and see what it covers. Use when the user supplies a code themselves, to confirm it before relying on it.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "2, 4, 6 or 8 digit HS code." },
      },
      required: ["code"],
    },
  },
] as const;
