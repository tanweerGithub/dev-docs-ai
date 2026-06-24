import type { ChatAction, CodeBlock, Resource } from "@/types";
import { detectLibrariesFromResources, libraryLabel } from "@/lib/libraries";

function buildResourceContext(resources: Resource[]): string {
  const ready = resources.filter((r) => r.status === "ready");
  if (ready.length === 0) return "No resources indexed yet.";

  return ready
    .map(
      (r, i) =>
        `[${i + 1}] ${r.name} (${r.type})
   URL: ${r.url ?? "n/a"}
   Summary: ${r.summary ?? "n/a"}
   Detected libraries: ${r.detectedLibraries?.join(", ") || "none"}`
    )
    .join("\n\n");
}

export async function chatWithLlm(
  apiKey: string,
  userMessage: string,
  resources: Resource[],
  currentCode?: CodeBlock,
  pendingAction?: ChatAction
): Promise<string> {
  const libs = detectLibrariesFromResources(resources).map(libraryLabel);
  const resourceContext = buildResourceContext(resources);

  const actionNote = pendingAction
    ? `The app is also updating the UI: switching to "${pendingAction.tab ?? "canvas"}" tab${
        pendingAction.codeBlock ? " with synthesized code" : ""
      }${pendingAction.nodes?.length ? ` and architecture diagram (${pendingAction.nodes.length} components)` : ""}. Mention this naturally.`
    : "";

  const systemPrompt = `You are DevDocs AI, an expert software integration assistant.
Answer using ONLY the indexed resources below. Be concise, practical, and developer-focused.
If information is missing from the resources, say so honestly.

Indexed resources:
${resourceContext}

Detected stack: ${libs.join(", ") || "unknown"}

Current synthesized code in playground:
${currentCode?.code?.slice(0, 1500) ?? "none yet"}

${actionNote}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(err.error?.message ?? `OpenAI API error (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}