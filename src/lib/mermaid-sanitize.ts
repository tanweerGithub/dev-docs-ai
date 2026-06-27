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

/** Strip markdown fences only — avoid rewriting diagram syntax. */
export function sanitizeMermaidDiagram(raw: unknown): string | null {
  const rawText = coerceToString(raw);
  if (!rawText?.trim()) return null;

  const text = rawText
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return text || null;
}