import { NextResponse } from "next/server";
import { ingestDocs, ingestGithub, ingestPdf } from "@/lib/ingest";
import type { ResourceType } from "@/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type: ResourceType;
      url?: string;
      name?: string;
    };

    const { type, url, name } = body;

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
      const result = ingestPdf(name ?? "uploaded.pdf");
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown resource type" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}