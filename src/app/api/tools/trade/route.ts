import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTopImporters,
  getIndiaExports,
  getTopExporters,
  getTradeTrend,
} from "@/lib/comtrade/tools";

export const dynamic = "force-dynamic";

/**
 * Trade intelligence test endpoint — the same tools Saathi will call at runtime.
 *
 *   POST /api/tools/trade
 *   Body: {
 *     tool: "getTopImporters" | "getIndiaExports" | "getTopExporters" | "getTradeTrend",
 *     args: { ... tool-specific args ... }
 *   }
 *
 * Or GET with query params for quick testing:
 *   GET /api/tools/trade?tool=getTopImporters&hsCode=8412
 */

type ToolName =
  | "getTopImporters"
  | "getIndiaExports"
  | "getTopExporters"
  | "getTradeTrend";

// Non-null assertions are safe: TypeScript proves each key exists.
const TOOLS = {
  getTopImporters,
  getIndiaExports,
  getTopExporters,
  getTradeTrend,
} as const;

function isToolName(x: unknown): x is ToolName {
  return typeof x === "string" && x in TOOLS;
}

async function callTool(tool: ToolName, args: Record<string, unknown>) {
  switch (tool) {
    case "getTopImporters":
      return TOOLS.getTopImporters(args as unknown as Parameters<typeof getTopImporters>[0]);
    case "getIndiaExports":
      return TOOLS.getIndiaExports(args as unknown as Parameters<typeof getIndiaExports>[0]);
    case "getTopExporters":
      return TOOLS.getTopExporters(args as unknown as Parameters<typeof getTopExporters>[0]);
    case "getTradeTrend":
      return TOOLS.getTradeTrend(args as unknown as Parameters<typeof getTradeTrend>[0]);
  }
}

export async function POST(request: Request) {
  // Auth-gate so the tool doesn't get spammed by anonymous callers
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { tool?: unknown; args?: unknown }
    | null;
  if (!body || !isToolName(body.tool)) {
    return NextResponse.json(
      { error: "Body must include a valid `tool` name." },
      { status: 400 }
    );
  }

  const args = (body.args ?? {}) as Record<string, unknown>;
  const result = await callTool(body.tool, args);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tool = url.searchParams.get("tool");
  if (!isToolName(tool)) {
    return NextResponse.json(
      {
        error: "Provide ?tool=getTopImporters|getIndiaExports|getTopExporters|getTradeTrend",
      },
      { status: 400 }
    );
  }

  // Coerce query params into the tool's args shape
  const args: Record<string, unknown> = {};
  const hsCode = url.searchParams.get("hsCode");
  const year = url.searchParams.get("year");
  const limit = url.searchParams.get("limit");
  const reporterIso = url.searchParams.get("reporterIso");
  const partnerIso = url.searchParams.get("partnerIso");
  const years = url.searchParams.get("years");
  const flow = url.searchParams.get("flow");

  if (hsCode) args.hsCode = hsCode;
  if (year) args.year = Number(year);
  if (limit) args.limit = Number(limit);
  if (reporterIso) args.reporterIso = reporterIso;
  if (partnerIso) args.partnerIso = partnerIso;
  if (years) args.years = Number(years);
  if (flow) args.flow = flow;

  const result = await callTool(tool, args);
  return NextResponse.json(result);
}
