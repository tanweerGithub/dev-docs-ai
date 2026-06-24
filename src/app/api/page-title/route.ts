import { NextResponse } from "next/server";
import {
  cleanPageTitle,
  fallbackResourceName,
  isAllowedTitleUrl,
  parseTitleFromHtml,
} from "@/lib/page-title";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim();

  if (!url || !isAllowedTitleUrl(url)) {
    return NextResponse.json(
      { title: url ? fallbackResourceName(url) : null },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "DevDocsAI-TitleFetcher/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ title: fallbackResourceName(url) });
    }

    const html = await res.text();
    const raw = parseTitleFromHtml(html);
    const title = raw
      ? cleanPageTitle(raw, url)
      : fallbackResourceName(url);

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: fallbackResourceName(url) });
  }
}