import type { ResearchResponse, Resource } from "@/types";

const MODEL = "gemini-2.0-flash";

function buildPrompt(message: string, resources: Resource[]): string {
  const docList = resources
    .map((r, i) => {
      if (r.type === "url") {
        return `[${i + 1}] ${r.name}\n    URL: ${r.url}`;
      }
      return `[${i + 1}] ${r.name}\n    Type: PDF (attached as file)`;
    })
    .join("\n");

  return `You are an agentic multi-document research assistant.

The user uploaded these research materials:
${docList || "No documents yet."}

User question: ${message}

Respond with JSON only:
{
  "answer": "Clear research answer in markdown. Cite which document(s) you used.",
  "citations": ["Document name — key point or URL"],
  "code": { "language": "python", "code": "..." } or null if not needed,
  "comparison": {
    "title": "Comparison title",
    "task": "What task the code snippets demonstrate",
    "items": [
      {
        "name": "Library or approach name",
        "scores": { "easeOfUse": 1-10, "documentation": 1-10, "flexibility": 1-10 },
        "codeSnippet": "minimal code for the SAME task",
        "codeLanguage": "python"
      }
    ]
  } or null,
  "diagram": "mermaid flowchart/graph TD syntax string" or null,
  "suggestedTab": "document|playground|comparison|diagram|null"
}

Rules:
- Ground answers in the provided documents/URLs/PDFs only.
- Include code only when the user needs implementation.
- Include comparison only when user asks to compare approaches/libraries.
- Include diagram when architecture/relationships would help.
- No winner recommendations in comparisons — neutral side-by-side only.
- suggestedTab hints which center panel is most relevant.`;
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function researchWithGemini(
  apiKey: string,
  message: string,
  resources: Resource[]
): Promise<ResearchResponse> {
  const parts: { text?: string; inline_data?: { mime_type: string; data: string } }[] = [
    { text: buildPrompt(message, resources) },
  ];

  for (const r of resources) {
    if (r.type === "pdf" && r.pdfBase64) {
      parts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: r.pdfBase64,
        },
      });
    }
  }

  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const urlResources = resources.filter((r) => r.type === "url" && r.url);
  if (urlResources.length > 0) {
    body.tools = [{ url_context: {} }];
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

  const parsed = parseJson<ResearchResponse>(text);
  return {
    answer: parsed.answer,
    citations: parsed.citations ?? [],
    code: parsed.code ?? null,
    comparison: parsed.comparison ?? null,
    diagram: parsed.diagram ?? null,
    suggestedTab: parsed.suggestedTab ?? null,
  };
}