import { NextResponse } from "next/server";
import { buildColabNotebook } from "@/lib/colab";

function decodeColabPayload(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const encoded = searchParams.get("code");
  const language = searchParams.get("lang") ?? "python";

  if (!encoded) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const code = decodeColabPayload(encoded);
    const notebook = buildColabNotebook(code, language);

    return new NextResponse(JSON.stringify(notebook), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'inline; filename="devdocs_ai.ipynb"',
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid code payload" }, { status: 400 });
  }
}