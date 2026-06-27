import { NextResponse } from "next/server";
import { researchWithGemini } from "@/lib/gemini";
import type { Resource } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message: string;
      resources: Resource[];
      apiKey?: string;
      webSearchEnabled?: boolean;
      scope?: "active" | "all";
    };

    const { message, resources, apiKey: clientKey, webSearchEnabled, scope } =
      body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const apiKey = clientKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Add your Gemini API key to start researching" },
        { status: 400 }
      );
    }

    const result = await researchWithGemini(
      apiKey,
      message,
      resources ?? [],
      webSearchEnabled === true,
      scope === "active" ? "active" : "all"
    );

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}