/** Strip markdown fences only — avoid rewriting diagram syntax. */
export function sanitizeMermaidDiagram(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;

  const text = raw
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return text || null;
}