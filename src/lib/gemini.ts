import { enrichCitations, type RawCitation } from "@/lib/citations";
import { sanitizeMermaidDiagram } from "@/lib/mermaid-sanitize";
import type { ChatCitation, ResearchResponse, Resource } from "@/types";

const MODEL = "gemini-2.5-flash";

const GEMINI_FILE_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/markdown",
  "text/html",
  "text/csv",
]);

function buildPrompt(
  message: string,
  resources: Resource[],
  webSearchEnabled: boolean
): string {
  const docList = resources
    .map((r, i) => {
      if (r.type === "url") {
        return `[${i + 1}] id: doc-${i + 1} | name: "${r.name}" | url: ${r.url}`;
      }
      return `[${i + 1}] id: doc-${i + 1} | name: "${r.name}" | type: ${r.mimeType ?? "file"} (attached inline)`;
    })
    .join("\n");

  return `You are DevDocs AI — a multi-document research assistant for technical documentation. You help developers research libraries, APIs, and frameworks from their uploaded docs.

The user's sources (cite these by sourceIndex — primary grounding):
${docList || "No documents yet."}

User question: ${message}

Respond with JSON only:
{
  "answer": "Clear research answer in markdown. Reference sources inline like [1] or [1 p.12] for PDFs. Prefer facts from the user's sources above.",
  "citations": [
    {
      "sourceIndex": 1,
      "label": "Exact source name from the list above",
      "excerpt": "Short quoted or paraphrased point from that source",
      "url": "URL if source is a url type, else null",
      "page": 12,
      "source": "document"
    }
  ],
  "code": { "language": "python", "code": "..." } or null,
  "comparison": { ... } or null,
  "diagram": "mermaid string" or null,
  "suggestedTab": "document|playground|comparison|diagram|null"
}

Citation rules (critical):
- ALWAYS cite user's uploaded sources first when used. Each citation must use sourceIndex matching [1], [2], etc.
- For PDFs and uploaded files, include page when known (page field) and reference inline as [1 p.12] in the answer.
- Set source to "document" for user sources. Include their url field when the source has a URL.
- Do not invent sourceIndex values — only use indices from the source list.
${
  webSearchEnabled
    ? `- Web search is ON: you may supplement with google_search only when user sources lack the answer. Mark those citations source: "web" with a real https url. User sources still take priority.`
    : `- Web search is OFF (document-only mode):
  • Use ONLY the user's listed sources and inline files. Do NOT use google_search.
  • Do NOT cite Medium, blogs, or any URL not in the source list above.
  • Every factual claim must trace to a user source citation.
  • If the sources do not contain enough information to answer, respond honestly in "answer" that nothing relevant was found in the current documents, and tell the user to turn on **Web search** near the chat box and ask again — or add more documentation.
  • In that case: code, comparison, and diagram should be null; citations empty or only from user sources.`
}

Mermaid diagram rules (when user asks for a diagram):
- Set suggestedTab to "diagram" and provide a valid diagram string.
- Use flowchart TD or graph TD only. No markdown fences or backticks inside diagram.
- Quote labels with special characters: A["Step 1"], subgraph G["Group name"]
- Avoid parentheses in unquoted labels. Keep node IDs simple (A, B, C1).

Research rules:
- Ground answers in the user's provided documents/URLs/files via url_context (for their links) and inline files.
- LangChain 1.x: create_agent only, never AgentExecutor.
- Google ADK: Agent class with run().
- Comparison: LangChain first, Google ADK second, same task, suggestedTab "comparison", code null.
- Single-framework code: suggestedTab "playground".`;
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

interface ParsedResearchResponse {
  answer: string;
  citations?: (string | RawCitation)[];
  code?: ResearchResponse["code"];
  comparison?: ResearchResponse["comparison"];
  diagram?: string | null;
  suggestedTab?: ResearchResponse["suggestedTab"];
}

export async function researchWithGemini(
  apiKey: string,
  message: string,
  resources: Resource[],
  webSearchEnabled = false
): Promise<ResearchResponse> {
  const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [
    { text: buildPrompt(message, resources, webSearchEnabled) },
  ];

  for (const r of resources) {
    if (r.type === "file" && r.fileBase64 && r.mimeType && GEMINI_FILE_MIMES.has(r.mimeType)) {
      parts.push({
        inline_data: {
          mime_type: r.mimeType,
          data: r.fileBase64,
        },
      });
    }
  }

  const urlResources = resources.filter((r) => r.type === "url" && r.url);
  const tools: Record<string, Record<string, never>>[] = [];
  if (urlResources.length > 0) {
    tools.push({ url_context: {} });
  }
  if (webSearchEnabled) {
    tools.push({ google_search: {} });
  }
  const useTools = tools.length > 0;

  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      // Gemini rejects tools + responseMimeType together on 2.5-flash.
      ...(useTools ? {} : { responseMimeType: "application/json" }),
    },
  };

  if (useTools) {
    body.tools = tools;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const parsed = parseJson<ParsedResearchResponse>(text);
  let citations: ChatCitation[] = enrichCitations(
    parsed.citations,
    resources
  );
  if (!webSearchEnabled) {
    citations = citations.filter((c) => c.source !== "web");
  }

  const diagram = sanitizeMermaidDiagram(parsed.diagram);

  return {
    answer: parsed.answer,
    citations,
    code: parsed.comparison ? null : (parsed.code ?? null),
    comparison: parsed.comparison ?? null,
    diagram,
    suggestedTab:
      diagram && !parsed.suggestedTab ? "diagram" : (parsed.suggestedTab ?? null),
  };
}