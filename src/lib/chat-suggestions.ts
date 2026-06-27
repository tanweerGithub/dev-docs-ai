import type { Resource } from "@/types";

function matches(r: Resource, pattern: RegExp): boolean {
  const haystack = `${r.name} ${r.url ?? ""}`.toLowerCase();
  return pattern.test(haystack);
}

function shortName(name: string, max = 36): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function buildChatSuggestions(resources: Resource[]): string[] {
  if (resources.length === 0) return [];

  const suggestions: string[] = [];
  const primary = resources[0];
  const secondary = resources[1];

  const hasLangchain = resources.some((r) => matches(r, /langchain/));
  const hasAdk = resources.some((r) => matches(r, /\badk\b|google.*adk|agent development kit/));
  const hasRedis = resources.some((r) => matches(r, /redis/));
  const hasMongo = resources.some((r) => matches(r, /mongo|pymongo/));

  if (resources.length >= 2 && (hasLangchain && hasAdk)) {
    suggestions.push(
      "Compare LangChain vs Google ADK for building a tool-using agent"
    );
  } else if (resources.length >= 2 && secondary) {
    suggestions.push(
      `Compare ${shortName(primary.name)} and ${shortName(secondary.name)} for the same task`
    );
  }

  for (const r of resources.slice(0, 2)) {
    if (r.mimeType === "application/pdf" || r.name.toLowerCase().endsWith(".pdf")) {
      suggestions.push(`Summarize the main topics in "${shortName(r.name, 28)}"`);
      suggestions.push(`What code examples are in "${shortName(r.name, 28)}"?`);
    } else if (r.type === "url") {
      suggestions.push(`What are the key concepts in ${shortName(r.name)}?`);
      suggestions.push(`Show me a practical code example from ${shortName(r.name)}`);
    } else if (r.type === "file") {
      suggestions.push(`Summarize "${shortName(r.name, 28)}" and cite the important sections`);
    }
  }

  if (hasAdk && !suggestions.some((s) => s.includes("ADK"))) {
    suggestions.push("How do I build a simple agent with tools using Google ADK?");
  }
  if (hasLangchain && !suggestions.some((s) => s.includes("LangChain"))) {
    suggestions.push("How do I create an agent with create_agent in LangChain?");
  }
  if (hasRedis) {
    suggestions.push("How do I connect to Redis and cache JSON data in Python?");
  }
  if (hasMongo) {
    suggestions.push("How do I connect to MongoDB with PyMongo and run basic CRUD?");
  }

  if (resources.some((r) => r.type === "url")) {
    suggestions.push(
      `Draw a mermaid architecture diagram based on ${shortName(primary.name)}`
    );
  }

  const unique: string[] = [];
  for (const s of suggestions) {
    if (!unique.includes(s)) unique.push(s);
    if (unique.length >= 3) break;
  }

  return unique;
}