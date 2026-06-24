export function fallbackResourceName(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    if (host.includes("redis.io") && path.includes("python")) {
      return "Redis — Python client";
    }
    if (host.includes("github.io") && path.includes("adk-docs")) {
      return "Google ADK — Agents";
    }
    if (host.includes("langchain.com") && path.includes("quickstart")) {
      return "LangChain — Quickstart";
    }
    if (host.includes("langchain.com")) {
      return "LangChain docs";
    }
    if (host.includes("fastapi.tiangolo.com")) {
      return "FastAPI docs";
    }

    const segments = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      const label = last
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `${u.hostname} — ${label}`;
    }

    return u.hostname;
  } catch {
    return url.slice(0, 60);
  }
}

export function cleanPageTitle(raw: string, url: string): string {
  let title = raw
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();

  if (
    title.startsWith("http://") ||
    title.startsWith("https://") ||
    title.includes("://")
  ) {
    return fallbackResourceName(url);
  }

  title = title.replace(/ \| Docs$/i, "");
  title = title.replace(/ - Documentation$/i, "");

  const suffixes = [
    / \| Redis$/i,
    / \| LangChain$/i,
    / \| Google GitHub$/i,
    / \| Read the Docs$/i,
  ];
  for (const re of suffixes) {
    title = title.replace(re, "");
  }

  if (!title || title.length < 3) {
    return fallbackResourceName(url);
  }

  return title.length > 72 ? `${title.slice(0, 72)}…` : title;
}

export function parseTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  return match[1].replace(/<[^>]+>/g, "").trim() || null;
}

export function isAllowedTitleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}