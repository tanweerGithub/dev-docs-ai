import type { CodeBlock, DocCitation, Resource } from "@/types";

export interface GeminiChatResult {
  message: string;
  code?: string | null;
  language?: string;
  citations?: {
    resourceName: string;
    excerpt: string;
    url?: string;
  }[];
  suggestions?: string[];
}

function buildResourceContext(resources: Resource[]): string {
  const ready = resources.filter((r) => r.status === "ready");
  if (ready.length === 0) return "No resources indexed yet.";

  return ready
    .map(
      (r, i) =>
        `[${i + 1}] id="${r.id}" name="${r.name}" type=${r.type}
   url: ${r.url ?? "n/a"}
   summary: ${r.summary ?? "n/a"}
   detected: ${r.detectedLibraries?.join(", ") || "none"}`
    )
    .join("\n\n");
}

function parseGeminiJson(text: string): GeminiChatResult {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as GeminiChatResult;
  if (!parsed.message) throw new Error("Invalid Gemini response shape");
  return parsed;
}

export async function askGemini(
  apiKey: string,
  userMessage: string,
  resources: Resource[],
  currentCode?: CodeBlock
): Promise<GeminiChatResult> {
  const resourceContext = buildResourceContext(resources);

  const prompt = `You are DevDocs AI — a developer assistant that answers ONLY from indexed documentation.

Indexed resources:
${resourceContext}

Current playground code:
${currentCode?.code?.slice(0, 2000) ?? "none"}

User request: ${userMessage}

Respond with JSON only (no markdown fences):
{
  "message": "Clear explanation citing which doc(s) you used. Include doc names and URLs inline.",
  "code": "Complete runnable code if the user wants implementation/setup/templates, otherwise null",
  "language": "python|typescript|javascript|other",
  "citations": [
    {
      "resourceName": "exact name from indexed resources",
      "excerpt": "relevant quote or paraphrased passage from that doc",
      "url": "doc url"
    }
  ],
  "suggestions": ["2-3 short follow-up prompts"]
}

Rules:
- Ground every claim in the indexed resource summaries. If info is missing, say so.
- When user asks to build/create/implement/setup something, provide code in "code".
- Always include citations with resourceName matching an indexed resource.
- Be practical and concise.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message ?? `Gemini API error (${res.status})`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty response from Gemini");

  return parseGeminiJson(text);
}

export function buildCodeBlockFromGemini(
  result: GeminiChatResult,
  resources: Resource[]
): CodeBlock | undefined {
  if (!result.code?.trim()) return undefined;

  const ready = resources.filter((r) => r.status === "ready");

  const citations: DocCitation[] = (result.citations ?? []).map((c, i) => {
    const resource = ready.find(
      (r) =>
        r.name === c.resourceName ||
        r.url === c.url ||
        r.name.toLowerCase().includes(c.resourceName.toLowerCase())
    );

    return {
      id: `cite-gemini-${i}`,
      resourceId: resource?.id ?? ready[0]?.id ?? "unknown",
      resourceName: c.resourceName,
      lineStart: 1,
      lineEnd: 1,
      excerpt: c.excerpt,
      url: c.url ?? resource?.url,
    };
  });

  return {
    id: `code-${Date.now()}`,
    language: result.language ?? "python",
    code: result.code.trim(),
    citations,
  };
}