import { NextResponse } from "next/server";
import { generateComparison } from "@/lib/gemini";
import type { Resource } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      resources: Resource[];
      apiKey?: string;
      goal?: string;
    };

    const { resources, apiKey: clientKey, goal } = body;
    const apiKey = clientKey?.trim() || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key required for comparison" },
        { status: 400 }
      );
    }

    const ready = (resources ?? []).filter((r) => r.status === "ready");
    if (ready.length < 2) {
      return NextResponse.json(
        { error: "Add at least 2 indexed resources to compare" },
        { status: 400 }
      );
    }

    const result = await generateComparison(apiKey, resources ?? [], goal);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Comparison failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}