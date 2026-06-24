import { NextResponse } from "next/server";
import { ingestDocs, ingestGithub, ingestPdf } from "@/lib/ingest";
import type { ResourceType } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type: ResourceType;
      url?: string;
      name?: string;
      fileData?: string;
    };

    const { type, url, name, fileData } = body;

    if (type === "github") {
      if (!url) {
        return NextResponse.json({ error: "URL required" }, { status: 400 });
      }
      const result = await ingestGithub(url);
      return NextResponse.json(result);
    }

    if (type === "docs") {
      if (!url) {
        return NextResponse.json({ error: "URL required" }, { status: 400 });
      }
      const result = await ingestDocs(url);
      return NextResponse.json(result);
    }

    if (type === "pdf") {
      const result = await ingestPdf(name ?? "uploaded.pdf", fileData);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown resource type" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}