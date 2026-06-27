import type { ChatCitation, Resource } from "@/types";

export interface RawCitation {
  sourceIndex?: number | null;
  label: string;
  excerpt?: string;
  url?: string | null;
  page?: number | null;
  source?: "document" | "web";
}

function matchResource(
  label: string,
  url: string | undefined,
  resources: Resource[]
): Resource | undefined {
  const lower = label.toLowerCase();
  return resources.find(
    (r) =>
      r.name.toLowerCase() === lower ||
      r.name.toLowerCase().includes(lower) ||
      lower.includes(r.name.toLowerCase()) ||
      (url && r.url === url) ||
      (r.url && label.includes(r.url))
  );
}

export function enrichCitations(
  raw: (string | RawCitation)[] | undefined,
  resources: Resource[]
): ChatCitation[] {
  if (!raw?.length) return [];

  return raw.map((item) => {
    if (typeof item === "string") {
      const urlMatch = item.match(/(https?:\/\/[^\s,]+)/);
      const url = urlMatch?.[1];
      const parts = item.split(/\s*—\s*|\s*-\s+/);
      const label = parts[0]?.trim() || item;
      const excerpt = parts.slice(1).join(" — ").trim() || undefined;
      const resource = matchResource(label, url, resources);

      return {
        label: resource?.name ?? label,
        excerpt,
        url: resource?.url ?? url,
        resourceId: resource?.id,
        source: resource ? "document" : url ? "web" : "document",
      };
    }

    const label =
      typeof item.label === "string"
        ? item.label
        : item.label != null
          ? String(item.label)
          : "Source";
    const excerpt =
      typeof item.excerpt === "string"
        ? item.excerpt
        : item.excerpt != null
          ? String(item.excerpt)
          : undefined;
    const citationUrl =
      typeof item.url === "string" ? item.url : undefined;

    const idx =
      typeof item.sourceIndex === "number" ? item.sourceIndex - 1 : -1;
    const byIndex = idx >= 0 ? resources[idx] : undefined;
    const resource =
      byIndex ?? matchResource(label, citationUrl, resources);

    const urlMatchesUserSource =
      !!citationUrl &&
      resources.some(
        (r) =>
          r.url === citationUrl ||
          (r.url && citationUrl.startsWith(r.url.replace(/\/$/, "")))
      );

    const isWeb =
      item.source === "web" ||
      (!!citationUrl && !byIndex && !urlMatchesUserSource && !resource);

    const page =
      typeof item.page === "number" && item.page > 0 ? item.page : undefined;

    return {
      label: resource?.name ?? label,
      excerpt,
      url: isWeb
        ? citationUrl
        : (resource?.url ?? citationUrl),
      resourceId: resource?.id,
      page,
      source: isWeb ? "web" : "document",
    };
  });
}

export function dedupeCitations(citations: ChatCitation[]): ChatCitation[] {
  const seen = new Set<string>();
  const result: ChatCitation[] = [];

  for (const citation of citations) {
    const key = citation.resourceId
      ? `doc:${citation.resourceId}`
      : citation.url
        ? `url:${citation.url}`
        : `label:${citation.source}:${citation.label}`;

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(citation);
  }

  return result;
}

export function normalizeMessageCitations(
  citations: ChatCitation[] | string[] | undefined,
  resources: Resource[]
): ChatCitation[] {
  if (!citations?.length) return [];
  if (typeof citations[0] === "string") {
    return dedupeCitations(
      enrichCitations(citations as string[], resources)
    );
  }
  return dedupeCitations(citations as ChatCitation[]);
}