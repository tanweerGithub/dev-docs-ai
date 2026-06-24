import { NextResponse } from "next/server";
import {
  checkEmbeddableFromHeaders,
  fetchUrlHeaders,
  isAllowedPreviewUrl,
} from "@/lib/embed-check";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();

  if (!url || !isAllowedPreviewUrl(url)) {
    return NextResponse.json(
      { embeddable: "unknown", reason: "Invalid URL" },
      { status: 400 }
    );
  }

  try {
    const headers = await fetchUrlHeaders(url);
    const result = checkEmbeddableFromHeaders(headers);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ embeddable: "unknown" });
  }
}