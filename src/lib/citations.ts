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

    const idx =
      typeof item.sourceIndex === "number" ? item.sourceIndex - 1 : -1;
    const byIndex = idx >= 0 ? resources[idx] : undefined;
    const resource =
      byIndex ?? matchResource(item.label, item.url ?? undefined, resources);

    const isWeb = item.source === "web" && !resource;

    const page =
      typeof item.page === "number" && item.page > 0 ? item.page : undefined;

    return {
      label: resource?.name ?? item.label,
      excerpt: item.excerpt,
      url: isWeb
        ? (item.url ?? undefined)
        : (resource?.url ?? item.url ?? undefined),
      resourceId: resource?.id,
      page,
      source: isWeb ? "web" : "document",
    };
  });
}

export function normalizeMessageCitations(
  citations: ChatCitation[] | string[] | undefined,
  resources: Resource[]
): ChatCitation[] {
  if (!citations?.length) return [];
  if (typeof citations[0] === "string") {
    return enrichCitations(citations as string[], resources);
  }
  return citations as ChatCitation[];
}