import { dedupeCitations, enrichCitations, type RawCitation } from "@/lib/citations";
import {
  applyLocalMermaidRepairs,
  detectMermaidIssues,
  extractMermaidFromMarkdown,
  sanitizeMermaidDiagram,
} from "@/lib/mermaid-sanitize";
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
  return /\b(code|snippet|example|implement|sample|multi-?agent|prompt)\b/i.test(
    message
  );
}

function normalizeScopedAnswer(answer: string, sourceName: string): string {
  return answer.replace(
    /((?:provided\s+)?(?:the\s+)?source\s*\[1\]\s+)[^\n.,;]+/gi,
    `$1${sourceName}`
  );
}

function asksForDiagram(message: string): boolean {
  return /\b(diagram|mermaid|flowchart|architecture|draw\s+(?:a|an)|visuali[sz]e)\b/i.test(
    message
  );
}

function buildPrompt(
  message: string,
  resources: Resource[],
  webSearchEnabled: boolean,
  scope: "active" | "all" = "all"
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
  const diagramRequest = asksForDiagram(message);
  const scopedSingle = scope === "active" && resources.length === 1;
  const scopedNote = scopedSingle
    ? `\nScoped query (@): the user limited this question to ONE source ONLY.
[1] is EXACTLY: "${resources[0].name}"${resources[0].url ? ` (${resources[0].url})` : ""}.
In answer prose, refer to [1] using this exact title only — NEVER name or cite any other documentation.
Use url_context to read that URL in full. ${
        webSearchEnabled
          ? "If the page lacks the answer, use google_search on the same domain when possible."
          : "Answer only from that source; do not use general knowledge."
      }\n`
    : "";

  return `You are DevDocs AI — a multi-document research assistant for technical documentation.

The user's sources (cite by sourceIndex):
${docList || "No documents yet."}
${scopedNote}
User question: ${message}

You MUST respond with a single valid JSON object (no markdown fences outside JSON). Never return an empty response.
Even when using url_context or google_search tools, your final message must be ONLY that JSON object.

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
2. CODE FROM DOCUMENTED API: If sources describe the API (classes, methods, content block types) but lack one combined runnable example, you MAY write a minimal runnable example using ONLY APIs shown in the sources. Cite [1], set code + suggestedTab "playground". Do NOT use ${NOT_FOUND_OPENING} when the docs give enough API detail to construct the example.
3. If the user asks for code and sources lack both runnable examples AND enough API detail, your answer MUST begin with exactly: ${NOT_FOUND_OPENING}
4. After a not-found line, at most 2 short sentences summarizing what sources do mention.
5. Then tell the user to turn on **Web search** near the chat box and ask again, or add documentation with the code.
6. Do not invent APIs not present in the sources.`
    : `1. Use url_context to read linked documentation, then google_search if needed.
2. Cite user sources with sourceIndex [1], [2]. For EVERY web page used via google_search, add a separate citation with source "web", a short page title as label, and the full https url (never null url).
3. If code or key facts came from the web, you MUST include web citations — do not list only the user's document when web sources were used.
4. If user asked for code and you find it (sources or web), set code + suggestedTab "playground".
5. Only if sources AND web lack the answer, begin with: **Could not find a reliable answer.** — never use "${NOT_FOUND_OPENING}" when web search is enabled.`
}
${
  codeRequest
    ? `
Code request rules:
- Only include "code" if you have a concrete runnable example from user sources${webSearchEnabled ? " or vetted web results" : ""}.
${
  webSearchEnabled
    ? "- Search the linked docs and web for runnable examples before saying code is unavailable."
    : `- Never bury "no code in documents" at the end — if missing, lead with ${NOT_FOUND_OPENING}`
}
- Do not pad with conceptual paragraphs when code was requested but is absent.`
    : ""
}

Citation rules:
- List each source AT MOST ONCE in the citations array. Repeat inline [1] in the answer as needed — do not duplicate the same sourceIndex many times.
- sourceIndex must match [1], [2] in the source list. No invented indices.
- PDFs: use page in citations and [1 p.12] inline when known.
${
  webSearchEnabled
    ? "- Web citations: source \"web\" with https url (required when google_search was used). Include BOTH document and web citations when both were used."
    : "- No web citations. No Medium, blogs, or URLs outside the source list."
}

Other rules:
- LangChain 1.x: create_agent only. Google ADK: Agent + run().
- Comparison: LangChain first, ADK second, suggestedTab "comparison", code null.
${
  diagramRequest
    ? `- DIAGRAM REQUEST: put the full mermaid source in the "diagram" field (raw mermaid, no fences). Use flowchart TD only (not graph TD). NEVER use class-diagram syntax (<|--, class) inside flowchart — use --> arrows for relationships. Quote labels: D["Model (LLM)"]. Subgraph titles in quotes. Max ~20 nodes. Set suggestedTab "diagram", code null.`
    : "- Diagrams: flowchart TD, no class-diagram syntax in flowchart, suggestedTab \"diagram\"."
}`;
}

function extractJsonFromText(text: string): string | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    const start = cleaned.indexOf("{");
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) return cleaned.slice(start, i + 1);
      }
    }
    return null;
  }
}

function parseJson<T>(text: string): T {
  const json = extractJsonFromText(text);
  if (!json) throw new Error("No JSON object in response");
  return JSON.parse(json) as T;
}

interface ParsedResearchResponse {
  answer: string;
  citations?: (string | RawCitation)[];
  code?: ResearchResponse["code"];
  comparison?: ResearchResponse["comparison"];
  diagram?: unknown;
  suggestedTab?: ResearchResponse["suggestedTab"];
}

function coerceToString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["mermaid", "diagram", "text", "content", "code", "value"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return null;
}

function normalizeParsedResponse(
  parsed: ParsedResearchResponse
): ParsedResearchResponse {
  const answer = coerceToString(parsed.answer) ?? "";
  let diagram =
    coerceToString(parsed.diagram) ??
    extractMermaidFromMarkdown(answer);
  let code = parsed.code as unknown;

  if (!diagram && code && typeof code === "object") {
    const codeObj = code as Record<string, unknown>;
    if (
      typeof codeObj.code === "string" &&
      /^(graph|flowchart|sequenceDiagram)/i.test(codeObj.code.trim())
    ) {
      diagram = codeObj.code;
      code = null;
    }
  }

  if (code && typeof code === "object") {
    const codeObj = code as Record<string, unknown>;
    if (
      typeof codeObj.code === "string" &&
      typeof codeObj.language === "string"
    ) {
      code = {
        language: codeObj.language,
        code: codeObj.code,
      };
    } else if (typeof codeObj.code === "string") {
      code = { language: "python", code: codeObj.code };
    } else {
      code = null;
    }
  }

  const validTabs = new Set([
    "document",
    "playground",
    "comparison",
    "diagram",
    null,
  ]);
  const suggestedTab = validTabs.has(parsed.suggestedTab ?? null)
    ? parsed.suggestedTab
    : diagram
      ? "diagram"
      : null;

  return {
    ...parsed,
    answer,
    diagram,
    code: (code as ResearchResponse["code"]) ?? null,
    suggestedTab,
  };
}

interface GeminiGroundingChunk {
  web?: { uri?: string; title?: string };
}

interface GeminiApiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
    groundingMetadata?: {
      groundingChunks?: GeminiGroundingChunk[];
      webSearchQueries?: string[];
    };
  }[];
  promptFeedback?: { blockReason?: string };
}

function extractGroundingCitations(data: GeminiApiResponse): ChatCitation[] {
  const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks?.length) return [];

  const seen = new Set<string>();
  const citations: ChatCitation[] = [];

  for (const chunk of chunks) {
    const uri = chunk.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);

    let label = chunk.web?.title?.trim();
    if (!label) {
      try {
        label = new URL(uri).hostname;
      } catch {
        label = uri;
      }
    }

    citations.push({ label, url: uri, source: "web" });
  }

  return citations;
}

function mergeCitations(
  primary: ChatCitation[],
  extra: ChatCitation[]
): ChatCitation[] {
  const merged = [...primary];
  for (const citation of extra) {
    const duplicate = merged.some(
      (c) =>
        (c.url && citation.url && c.url === citation.url) ||
        (c.source === "web" &&
          citation.source === "web" &&
          c.label === citation.label)
    );
    if (!duplicate) merged.push(citation);
  }
  return merged;
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
    return `**Could not complete this request.**\n\nGemini returned no usable text. Try rephrasing your question, scoping to one source with @, or asking again in a moment.`;
  }
  return `${NOT_FOUND_OPENING}\n\nYour current sources don't contain enough on this topic. Turn on **Web search** above the chat box and ask again, or add documentation that covers it.`;
}

function fallbackResponse(
  message: string,
  webSearchEnabled: boolean
): ResearchResponse {
  const code = asksForCode(message);

  if (webSearchEnabled) {
    return {
      answer: `**Could not find a reliable answer.**\n\nWeb search and your sources did not return a usable result for this question. Try rephrasing (e.g. name the library explicitly: "LangChain multimodal prompt with image and audio"), or add a doc link that covers this topic.`,
      citations: [],
      code: null,
      comparison: null,
      diagram: null,
      suggestedTab: null,
    };
  }

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

async function structureAsJson(
  apiKey: string,
  rawText: string,
  message: string,
  resources: Resource[],
  webSearchEnabled: boolean
): Promise<ParsedResearchResponse | null> {
  const prompt = `Format this research into a single JSON object. User question: ${message}

Research output:
${rawText.slice(0, 14000)}

Return ONLY JSON:
{
  "answer": "markdown string",
  "citations": [{ "sourceIndex": 1, "label": "...", "excerpt": "...", "url": null, "page": null, "source": "document" }],
  "code": { "language": "python", "code": "..." } or null,
  "comparison": null,
  "diagram": null,
  "suggestedTab": null
}

User has ${resources.length} source(s). ${
    webSearchEnabled
      ? 'Web citations use source "web" with https url.'
      : "No web citations."
  }`;

  const data = await callGemini(
    apiKey,
    buildRequestBody([{ text: prompt }], [], true)
  );
  const text = extractResponseText(data);
  if (!text) return null;

  try {
    return parseJson<ParsedResearchResponse>(text);
  } catch {
    return null;
  }
}

export async function fixMermaidDiagram(
  apiKey: string,
  diagram: string,
  message: string,
  options?: { parseError?: string; issues?: string[] }
): Promise<string | null> {
  const local = applyLocalMermaidRepairs(diagram);
  const issues = options?.issues ?? detectMermaidIssues(local);
  const parseError = options?.parseError;

  const prompt = `You fix broken mermaid diagrams. Return ONLY valid mermaid source — no JSON, no markdown fences, no explanation.

User asked: ${message}

STRICT RULES:
1. Use exactly ONE diagram starting with "flowchart TD" (or "flowchart LR" if wide).
2. NEVER use class-diagram syntax (<|--, ..|>, class) inside flowchart.
3. Show type hierarchies with --> arrows (parent --> child), not inheritance arrows.
4. Quote labels with spaces or parentheses: A["System Message"]
5. Quote subgraph titles: subgraph "Message Types"
6. Keep ≤20 nodes; avoid edge labels with special characters unless quoted.
7. No trailing semicolons.

${issues.length ? `Detected problems:\n${issues.map((i) => `- ${i}`).join("\n")}\n` : ""}${
    parseError ? `Mermaid parse error:\n${parseError}\n` : ""
  }
Broken diagram:
${local}

Fixed mermaid:`;

  const data = await callGemini(
    apiKey,
    buildRequestBody([{ text: prompt }], [], false)
  );
  const text = extractResponseText(data);
  if (!text) return null;

  return (
    sanitizeMermaidDiagram(text) ?? applyLocalMermaidRepairs(text.trim())
  );
}

async function finalizeMermaidDiagram(
  apiKey: string,
  diagram: string,
  message: string
): Promise<string | null> {
  let current = applyLocalMermaidRepairs(diagram);
  let issues = detectMermaidIssues(current);

  for (let attempt = 0; attempt < 2 && issues.length > 0; attempt++) {
    const fixed = await fixMermaidDiagram(apiKey, current, message, { issues });
    if (!fixed) break;
    current = applyLocalMermaidRepairs(fixed);
    issues = detectMermaidIssues(current);
  }

  return current || null;
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
  webSearchEnabled = false,
  scope: "active" | "all" = "all"
): Promise<ResearchResponse> {
  const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [
    { text: buildPrompt(message, resources, webSearchEnabled, scope) },
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

  let responseData = await callGemini(
    apiKey,
    buildRequestBody(parts, fullTools, fullTools.length === 0)
  );
  let text = extractResponseText(responseData);

  if (!text && fullTools.length > 0) {
    const retryTools: Record<string, Record<string, never>>[] = [
      ...urlTool,
      ...(webSearchEnabled ? [{ google_search: {} }] : []),
    ];
    responseData = await callGemini(
      apiKey,
      buildRequestBody(parts, retryTools, false)
    );
    text = extractResponseText(responseData);
  }

  if (!text && !webSearchEnabled) {
    responseData = await callGemini(apiKey, buildRequestBody(parts, [], true));
    text = extractResponseText(responseData);
  }

  if (!text) {
    return {
      answer: emptyResponseMessage(responseData, webSearchEnabled),
      citations: [],
      code: null,
      comparison: null,
      diagram: null,
      suggestedTab: null,
    };
  }

  let parsed: ParsedResearchResponse | null = null;
  try {
    parsed = parseJson<ParsedResearchResponse>(text);
  } catch {
    const structured = await structureAsJson(
      apiKey,
      text,
      message,
      resources,
      webSearchEnabled
    );
    parsed = structured;
  }

  if (!parsed) {
    return fallbackResponse(message, webSearchEnabled);
  }

  parsed = normalizeParsedResponse(parsed);

  if (!parsed.answer.trim()) {
    return fallbackResponse(message, webSearchEnabled);
  }

  let citations: ChatCitation[] = enrichCitations(parsed.citations, resources);
  if (webSearchEnabled) {
    citations = mergeCitations(
      citations,
      extractGroundingCitations(responseData)
    );
  } else {
    citations = citations.filter((c) => c.source !== "web");
  }
  citations = dedupeCitations(citations);

  let diagram =
    sanitizeMermaidDiagram(parsed.diagram) ??
    sanitizeMermaidDiagram(extractMermaidFromMarkdown(parsed.answer));

  if (diagram) {
    diagram = await finalizeMermaidDiagram(apiKey, diagram, message);
  }

  const diagramRequest = asksForDiagram(message);
  const suggestedTab =
    diagram && (!parsed.suggestedTab || diagramRequest)
      ? "diagram"
      : (parsed.suggestedTab ?? null);

  let answer = parsed.answer;
  if (scope === "active" && resources.length === 1) {
    answer = normalizeScopedAnswer(answer, resources[0].name);
  }

  return {
    answer,
    citations,
    code:
      parsed.comparison || (diagram && diagramRequest)
        ? null
        : (parsed.code ?? null),
    comparison: parsed.comparison ?? null,
    diagram,
    suggestedTab,
  };
}