import { NextResponse } from "next/server";
import { fixMermaidDiagram } from "@/lib/gemini";
import {
  applyLocalMermaidRepairs,
  detectMermaidIssues,
} from "@/lib/mermaid-sanitize";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      diagram: string;
      message?: string;
      parseError?: string;
      apiKey?: string;
    };

    const { diagram, message, parseError, apiKey: clientKey } = body;

    if (!diagram?.trim()) {
      return NextResponse.json({ error: "Diagram required" }, { status: 400 });
    }

    const apiKey = clientKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Add your Gemini API key to fix diagrams" },
        { status: 400 }
      );
    }

    const local = applyLocalMermaidRepairs(diagram);
    const issues = detectMermaidIssues(local);

    const fixed = await fixMermaidDiagram(
      apiKey,
      local,
      message ?? "Fix mermaid diagram",
      { issues, parseError }
    );

    if (!fixed) {
      return NextResponse.json(
        { error: "Could not repair diagram" },
        { status: 422 }
      );
    }

    return NextResponse.json({ diagram: fixed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Diagram fix failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}