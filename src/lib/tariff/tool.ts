/**
 * Saathi-callable import-duty tool.
 *
 * Answers the question that follows "where should I sell this?" — namely
 * "what will it cost my buyer to land it there?"
 */

import {
  destinationDuty,
  supportedDestinations,
  type DestinationDutyArgs,
} from "./destination";

export const TARIFF_TOOLS = [
  {
    name: "getImportDuty",
    description:
      "Get the import duty a DESTINATION country charges on a product — what the overseas buyer pays to land it. Call this when the user asks about duties, tariffs, landed cost, or how competitive their price will be in a specific market. This is the destination's duty, NOT India's. Needs the 6-digit HS code and the destination's ISO-3 country code.",
    parameters: {
      type: "object",
      properties: {
        hsCode: {
          type: "string",
          description: "6-digit HS code, normally from classifyProduct.",
        },
        destinationIso: {
          type: "string",
          description:
            "ISO-3 code of the importing country, e.g. 'DEU' for Germany, 'ARE' for the UAE, 'USA' for the United States.",
        },
      },
      required: ["hsCode", "destinationIso"],
    },
  },
] as const;

/** Handler, shaped like the other tool handlers the agent dispatches. */
export async function getImportDuty(args: DestinationDutyArgs) {
  const result = await destinationDuty(args);
  if (result.ok) return result;

  // Append the supported list only when the country was the problem, so the
  // model can offer a real alternative instead of guessing at coverage.
  const iso = String(args?.destinationIso ?? "").toUpperCase();
  if (!result.error.startsWith("No tariff data for")) return result;

  return {
    ...result,
    narrative:
      `${result.narrative} Destinations we do hold duties for: ` +
      `${supportedDestinations().join(", ")}. Offer one of these instead of ${iso} ` +
      `if it is useful to the user.`,
  };
}
