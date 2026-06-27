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

const NOT_FOUND_OPENING =
  "**Not found in your sources.**";

function asksForCode(message: string): boolean {
  return /\b(code|snippet|example|implement|sample|multi-?agent)\b/i.test(
    message
  );
}

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

  const codeRequest = asksForCode(message);

  return `You are DevDocs AI — a multi-document research assistant for technical documentation.

The user's sources (cite by sourceIndex):
${docList || "No documents yet."}

User question: ${message}

You MUST respond with a single valid JSON object (no markdown fences outside JSON). Never return an empty response.

{
  "answer": "markdown string",
  "citations": [{ "sourceIndex": 1, "label": "...", "excerpt": "...", "url": null, "page": null, "source": "document" }],
  "code": { "language": "python", "code": "..." } or null,
  "comparison": null,
  "diagram": null,
  "suggestedTab": "document|playground|comparison|diagram|null"
}

Answer structure (critical — follow order):
${
  !webSearchEnabled
    ? `1. DOCUMENT-ONLY MODE — check sources FIRST before writing anything else.
2. If the user asks for code/examples and the sources lack runnable code for that topic, your answer MUST begin with exactly: ${NOT_FOUND_OPENING}
3. After that line, at most 2 short sentences (optional) summarizing what sources do mention — no long essays.
4. Then tell the user to turn on **Web search** near the chat box and ask again, or add documentation that contains the code.
5. Set code, comparison, diagram to null. Do not fabricate code from general knowledge.
6. If sources have zero relevant content, only output the not-found block + next-step guidance (under 80 words total).`
    : `1. Check user sources first. If they contain the answer, use them and cite [1], [2], etc.
2. If user sources lack code or detail, use google_search and cite source: "web".
3. If user asked for code and you find it (sources or web), set code + suggestedTab "playground".
4. If nothing useful after sources + web, begin answer with: **Could not find a reliable answer.** Then explain briefly and suggest adding a more specific doc link.`
}
${
  codeRequest
    ? `
Code request rules:
- Only include "code" if you have a concrete runnable example from user sources${webSearchEnabled ? " or vetted web results" : ""}.
- Never bury "no code in documents" at the end — if missing, lead with ${NOT_FOUND_OPENING}
- Do not pad with conceptual paragraphs when code was requested but is absent.`
    : ""
}

Citation rules:
- sourceIndex must match [1], [2] in the source list. No invented indices.
- PDFs: use page in citations and [1 p.12] inline when known.
${
  webSearchEnabled
    ? "- Web citations: source \"web\" with https url. User sources take priority."
    : "- No web citations. No Medium, blogs, or URLs outside the source list."
}

Other rules:
- LangChain 1.x: create_agent only. Google ADK: Agent + run().
- Comparison: LangChain first, ADK second, suggestedTab "comparison", code null.
- Diagrams: flowchart TD, valid mermaid, suggestedTab "diagram".`;
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

interface GeminiApiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

function extractResponseText(data: GeminiApiResponse): string | null {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;

  const text = parts
    .map((p) => p.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || null;
}

function emptyResponseMessage(
  data: GeminiApiResponse,
  webSearchEnabled: boolean
): string {
  const finish = data.candidates?.[0]?.finishReason;
  const blocked = data.promptFeedback?.blockReason;

  if (blocked) {
    return `Response blocked (${blocked}). Try rephrasing your question.`;
  }
  if (finish && finish !== "STOP") {
    return `Gemini stopped early (${finish}). Try a shorter or more specific question.`;
  }
  if (webSearchEnabled) {
    return `${NOT_FOUND_OPENING}\n\nI couldn't complete a web search for this request. Try scoping to one source with @, or rephrase (e.g. "show ADK multi-agent code from my linked doc").`;
  }
  return `${NOT_FOUND_OPENING}\n\nYour current sources don't contain enough on this topic. Turn on **Web search** above the chat box and ask again, or add documentation that covers it.`;
}

function fallbackResponse(
  message: string,
  webSearchEnabled: boolean
): ResearchResponse {
  const code = asksForCode(message);
  const hint = code
    ? "Add a doc link that includes code examples, or enable **Web search** and ask again."
    : "Add more relevant documentation, or enable **Web search** and ask again.";

  return {
    answer: `${NOT_FOUND_OPENING}\n\nI couldn't produce an answer from your session. ${hint}`,
    citations: [],
    code: null,
    comparison: null,
    diagram: null,
    suggestedTab: null,
  };
}

async function callGemini(
  apiKey: string,
  body: Record<string, unknown>
): Promise<GeminiApiResponse> {
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

  return (await res.json()) as GeminiApiResponse;
}

function buildRequestBody(
  parts: { text?: string; inline_data?: { mime_type: string; data: string } }[],
  tools: Record<string, Record<string, never>>[],
  jsonMode: boolean
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (tools.length > 0) {
    body.tools = tools;
  }
  return body;
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
  const urlTool = urlResources.length > 0 ? [{ url_context: {} }] : [];
  const fullTools: Record<string, Record<string, never>>[] = [
    ...urlTool,
    ...(webSearchEnabled ? [{ google_search: {} }] : []),
  ];

  let data = await callGemini(
    apiKey,
    buildRequestBody(parts, fullTools, fullTools.length === 0)
  );
  let text = extractResponseText(data);

  if (!text && fullTools.length > 0) {
    const retryTools = urlTool.length > 0 ? urlTool : [];
    data = await callGemini(
      apiKey,
      buildRequestBody(parts, retryTools, retryTools.length === 0)
    );
    text = extractResponseText(data);
  }

  if (!text) {
    data = await callGemini(apiKey, buildRequestBody(parts, [], true));
    text = extractResponseText(data);
  }

  if (!text) {
    return {
      answer: emptyResponseMessage(data, webSearchEnabled),
      citations: [],
      code: null,
      comparison: null,
      diagram: null,
      suggestedTab: null,
    };
  }

  let parsed: ParsedResearchResponse;
  try {
    parsed = parseJson<ParsedResearchResponse>(text);
  } catch {
    return fallbackResponse(message, webSearchEnabled);
  }

  if (!parsed.answer?.trim()) {
    return fallbackResponse(message, webSearchEnabled);
  }

  let citations: ChatCitation[] = enrichCitations(parsed.citations, resources);
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