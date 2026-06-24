export type EmbeddableStatus = "yes" | "no" | "unknown";

export interface EmbedCheckResult {
  embeddable: EmbeddableStatus;
  reason?: string;
}

function parseFrameAncestors(csp: string): string | null {
  const match = csp.match(/frame-ancestors\s+([^;]+)/i);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

export function checkEmbeddableFromHeaders(
  headers: Headers
): EmbedCheckResult {
  const xfo = headers.get("x-frame-options")?.trim().toLowerCase();
  if (xfo === "deny") {
    return {
      embeddable: "no",
      reason:
        "This site sets X-Frame-Options: DENY, so it cannot be shown inside an embedded preview.",
    };
  }
  if (xfo === "sameorigin") {
    return {
      embeddable: "no",
      reason:
        "This site only allows embedding on its own domain (X-Frame-Options: SAMEORIGIN).",
    };
  }

  const csp = headers.get("content-security-policy") ?? "";
  const ancestors = parseFrameAncestors(csp);

  if (ancestors) {
    if (ancestors.includes("'none'") || ancestors === "none") {
      return {
        embeddable: "no",
        reason:
          "This site's Content-Security-Policy blocks all embedded previews (frame-ancestors 'none').",
      };
    }

    const tokens = ancestors.split(/\s+/);
    if (
      tokens.length > 0 &&
      tokens.every((t) => t === "'self'" || t === "self")
    ) {
      return {
        embeddable: "no",
        reason:
          "This site's Content-Security-Policy only allows embedding on its own domain.",
      };
    }
  }

  return { embeddable: "unknown" };
}

const BLOCKED_PHRASES = [
  "refused to connect",
  "x-frame-options",
  "frame ancestors",
  "cannot be displayed in a frame",
  "can't be displayed in a frame",
  "not allowed to display this page",
  "this page can't be displayed",
  "checking your browser before accessing",
];

export function detectBlockedFromIframe(
  iframe: HTMLIFrameElement
): boolean {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return false;

    const text = (
      doc.body?.innerText ||
      doc.body?.textContent ||
      ""
    ).toLowerCase();

    return BLOCKED_PHRASES.some((phrase) => text.includes(phrase));
  } catch {
    return false;
  }
}

export async function fetchUrlHeaders(url: string): Promise<Headers> {
  const init: RequestInit = {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "DevDocsAI-EmbedCheck/1.0" },
  };

  try {
    const head = await fetch(url, { ...init, method: "HEAD" });
    if (head.ok || head.status === 405 || head.status === 403) {
      return head.headers;
    }
  } catch {
    // fall through to GET
  }

  const get = await fetch(url, {
    ...init,
    method: "GET",
    headers: {
      ...init.headers,
      Range: "bytes=0-0",
    },
  });
  return get.headers;
}

export function isAllowedPreviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}