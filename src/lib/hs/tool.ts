/**
 * Saathi-callable HS classification tool.
 *
 * Returns a SHORTLIST, never a verdict. The model picks from what comes back
 * and may not name a code that isn't here — that is the whole point: it stops
 * HS codes being recalled from training memory, where the same product got
 * 4202, 420222, 4201 and 4102 on different runs.
 */

import { searchHsCodes, lookupHsCode, type HsCandidate } from "./classify";
import { tariffLinesFor, ITCHS_SOURCE, type TariffLine } from "./itchs";
import { lookupRodtep, RODTEP_SOURCE, type RodtepRate } from "./rodtep";

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

export interface TariffLineArgs {
  /** 6-digit HS code, normally one the model just resolved via classifyProduct. */
  hsCode: string;
}

/**
 * Narrow a 6-digit HS heading to India's 8-digit tariff lines.
 *
 * Kept apart from the trade-data tools on purpose. Comtrade speaks 6-digit and
 * answers an unrecognised code with TOTAL trade rather than an error, so an
 * 8-digit code must never reach it. This is for the shipping bill and the
 * export-policy check, not for market figures.
 */
export interface TariffLineWithRebate extends TariffLine {
  /** RoDTEP rebate for this line, or null when the schedule omits it. */
  rodtep: RodtepRate | null;
}

export function getIndianTariffLines(
  args: TariffLineArgs
): HsToolResult<{
  hsCode: string;
  lines: TariffLineWithRebate[];
  source: string;
}> {
  const hsCode = String(args?.hsCode ?? "").replace(/\D/g, "");
  if (hsCode.length < 6) {
    return {
      ok: false,
      error: "Need a 6-digit HS code.",
      narrative:
        "I need the 6-digit HS code first — classify the product before looking up the Indian tariff line.",
    };
  }

  const lines = tariffLinesFor(hsCode);
  if (lines.length === 0) {
    return {
      ok: false,
      error: "No ITC-HS lines for that heading.",
      narrative:
        `DGFT's export schedule lists no 8-digit tariff line under HS ${hsCode.slice(0, 6)}. ` +
        `Tell the user the 6-digit code stands and the tariff line must be confirmed with ` +
        `DGFT or a customs broker.`,
    };
  }

  const enriched: TariffLineWithRebate[] = lines.map((l) => ({
    ...l,
    rodtep: lookupRodtep(l.code),
  }));

  const restricted = lines.filter((l) => l.policy !== "Free");

  let narrative =
    `Indian tariff lines under HS ${hsCode.slice(0, 6)} (${ITCHS_SOURCE.name}): ` +
    enriched
      .map((l) => {
        const r = l.rodtep
          ? `RoDTEP ${l.rodtep.notifiedRatePct}% of FOB` +
            (l.rodtep.capPerUnitInr !== null
              ? ` capped at Rs ${l.rodtep.capPerUnitInr}/${l.rodtep.unit || "unit"}`
              : "")
          : "no RoDTEP rate in the schedule";
        return `${l.code} — ${l.description} [${l.policy}] (${r})`;
      })
      .join(" | ") +
    ". Choose the one matching the product and tell the user which you used.";

  if (restricted.length > 0) {
    // Surfaced as an instruction rather than left for the model to notice: a
    // missed Prohibited status is the most costly thing this tool can get wrong.
    narrative +=
      ` MANDATORY: ${restricted
        .map((l) => `${l.code} is ${l.policy}`)
        .join(", ")}. You MUST tell the user this and quote the condition ` +
      `verbatim if one applies. Do not describe a Restricted or Prohibited line as exportable.`;
  }

  if (enriched.some((l) => l.rodtep)) {
    // Stated as an instruction because the notified rate is NOT what an
    // exporter will actually receive, and a bare percentage reads as a promise.
    narrative +=
      ` MANDATORY on RoDTEP: these are NOTIFIED rates. ${RODTEP_SOURCE.rationalisation.description} ` +
      `${RODTEP_SOURCE.rationalisation.verify} Never quote a single effective percentage — ` +
      `give the notified rate and say the limitation applies.`;
  }

  narrative += ` ${ITCHS_SOURCE.note}`;

  return {
    ok: true,
    cached: true,
    narrative,
    data: {
      hsCode: hsCode.slice(0, 6),
      lines: enriched,
      source: ITCHS_SOURCE.name,
    },
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
  {
    name: "getIndianTariffLines",
    description:
      "Get India's 8-digit ITC-HS tariff lines under a 6-digit HS heading, with each line's export policy (Free, Restricted, Prohibited or STE) and its RoDTEP rebate rate. Call this when the user asks about the Indian tariff line, the code for a shipping bill, export documentation, export incentives or rebates, or whether a product can legally be exported. Do NOT pass an 8-digit code to any trade-data tool — those need the 6-digit code.",
    parameters: {
      type: "object",
      properties: {
        hsCode: {
          type: "string",
          description:
            "The 6-digit HS code, normally the one classifyProduct just resolved.",
        },
      },
      required: ["hsCode"],
    },
  },
] as const;
