import type {
  CodeBlock,
  DocCitation,
  DynamicComparison,
  Resource,
} from "@/types";

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

export interface GeminiComparisonResult {
  category: string;
  task: string;
  items: DynamicComparison[];
}

function buildResourceContext(
  resources: Resource[],
  focusResourceId?: string
): string {
  const ready = resources.filter((r) => r.status === "ready");
  if (ready.length === 0) return "No resources indexed yet.";

  const list = focusResourceId
    ? ready.filter((r) => r.id === focusResourceId)
    : ready;

  return list
    .map(
      (r, i) =>
        `[${i + 1}] id="${r.id}" name="${r.name}" type=${r.type} category=${r.category ?? "unknown"}
   url: ${r.url ?? "n/a"}
   summary: ${r.summary ?? "n/a"}
   content: ${(r.content ?? r.summary ?? "").slice(0, 2500)}`
    )
    .join("\n\n");
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
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
  return text;
}

export async function askGemini(
  apiKey: string,
  userMessage: string,
  resources: Resource[],
  currentCode?: CodeBlock,
  focusResourceId?: string
): Promise<GeminiChatResult> {
  const resourceContext = buildResourceContext(resources, focusResourceId);

  const prompt = `You are DevDocs AI — answer ONLY from indexed documentation.

Indexed resources:
${resourceContext}

Current playground code:
${currentCode?.code?.slice(0, 2000) ?? "none"}

User request: ${userMessage}

Respond with JSON only:
{
  "message": "Answer citing doc names and URLs. Reference specific passages.",
  "code": "Runnable code if user wants implementation, else null",
  "language": "python|typescript|javascript|java|other",
  "citations": [{"resourceName": "...", "excerpt": "...", "url": "..."}],
  "suggestions": ["2-3 follow-ups"]
}`;

  return parseJson<GeminiChatResult>(await callGemini(apiKey, prompt));
}

export async function generateComparison(
  apiKey: string,
  resources: Resource[],
  userGoal?: string
): Promise<GeminiComparisonResult> {
  const ready = resources.filter((r) => r.status === "ready");
  const goal =
    userGoal?.trim() ||
    "a common getting-started task inferred from the documentation";

  const prompt = `Compare these indexed developer resources for: ${goal}

Resources:
${buildResourceContext(resources)}

Respond with JSON only:
{
  "category": "inferred category e.g. agent framework",
  "task": "the task both code snippets demonstrate",
  "items": [
    {
      "resourceId": "exact id from resources",
      "name": "library/doc name",
      "category": "category",
      "docsUrl": "url or empty",
      "scorecard": {
        "easeOfUse": 1-10,
        "documentation": 1-10,
        "flexibility": 1-10,
        "productionReadiness": 1-10
      },
      "codeSnippet": "minimal code for the SAME task using this library",
      "codeLanguage": "python|typescript|etc"
    }
  ]
}

Rules:
- Include ALL provided resources that are relevant to the goal.
- NO winner or recommendation — neutral side-by-side only.
- Each codeSnippet must solve the SAME task for fair comparison.
- Ground scorecards in the indexed content.`;

  const parsed = parseJson<{
    category: string;
    task: string;
    items: Omit<DynamicComparison, "id">[];
  }>(await callGemini(apiKey, prompt));

  return {
    category: parsed.category,
    task: parsed.task,
    items: parsed.items.map((item, i) => ({
      ...item,
      id: `cmp-${i}-${Date.now()}`,
      resourceId:
        item.resourceId ??
        ready.find((r) => r.name === item.name)?.id ??
        ready[i]?.id ??
        `unknown-${i}`,
    })),
  };
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