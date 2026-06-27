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

const MERMAID_START =
  /^(graph\s+(?:TD|TB|BT|RL|LR)|flowchart\s+(?:TD|TB|BT|RL|LR)|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|sankey-beta|block-beta)/im;

/** Pull mermaid source from markdown answer text when the JSON diagram field is empty. */
export function extractMermaidFromMarkdown(text: string): string | null {
  if (!text?.trim()) return null;

  const mermaidFence = text.match(/```mermaid\s*\n([\s\S]*?)```/i);
  if (mermaidFence?.[1]?.trim()) return mermaidFence[1].trim();

  const fences = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)];
  for (const match of fences) {
    const body = match[1]?.trim();
    if (body && MERMAID_START.test(body)) return body;
  }

  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (MERMAID_START.test(lines[i].trim())) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  const collected: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (i > start && line.trim() === "") break;
    if (i > start && /^#{1,6}\s/.test(line)) break;
    collected.push(line);
  }

  const candidate = collected.join("\n").trim();
  return MERMAID_START.test(candidate) ? candidate : null;
}

/** Quote labels that contain characters which break flowchart parsing. */
export function repairMermaidSyntax(diagram: string): string {
  let text = diagram
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // [Model (LLM)] → ["Model (LLM)"]
  text = text.replace(
    /([\w-]+)\[([^\]"\n]+)\]/g,
    (match, id: string, label: string) => {
      const trimmed = label.trim();
      if (/[()/:;,]/.test(trimmed)) {
        const escaped = trimmed.replace(/"/g, '\\"');
        return `${id}["${escaped}"]`;
      }
      return match;
    }
  );

  // (Label (nested)) → ("Label (nested)") for rounded nodes
  text = text.replace(
    /([\w-]+)\(([^)"\n]+)\)/g,
    (match, id: string, label: string) => {
      const trimmed = label.trim();
      if (/[()]/.test(trimmed)) {
        const escaped = trimmed.replace(/"/g, '\\"');
        return `${id}("${escaped}")`;
      }
      return match;
    }
  );

  // subgraph Agent Types → subgraph "Agent Types"
  text = text.replace(
    /^(\s*subgraph\s+)([^"\n\[\]]+)$/gm,
    (match, prefix: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed || trimmed.startsWith('"')) return match;
      if (/\s/.test(trimmed) || /[()]/.test(trimmed)) {
        const escaped = trimmed.replace(/"/g, '\\"');
        return `${prefix}"${escaped}"`;
      }
      return match;
    }
  );

  // Trailing semicolons can confuse the parser on some diagrams
  text = text.replace(/;(\s*)$/gm, "$1");

  return text;
}

/** Strip markdown fences and repair common syntax issues. */
export function sanitizeMermaidDiagram(raw: unknown): string | null {
  const rawText = coerceToString(raw);
  if (!rawText?.trim()) return null;

  const repaired = repairMermaidSyntax(rawText.trim());
  return repaired || null;
}