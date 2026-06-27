const DIAGRAM_START =
  /^(graph\s+(?:TD|TB|BT|RL|LR)|flowchart\s+(?:TD|TB|BT|RL|LR)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|mindmap|timeline|gitGraph)/i;

export function sanitizeMermaidDiagram(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let text = raw.trim();
  text = text
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  if (!text) return null;

  if (!DIAGRAM_START.test(text)) {
    const body = text.replace(/\n/g, " ").trim();
    text = `flowchart TD\n  A["${body.slice(0, 120)}"]`;
  }

  text = text
    .split("\n")
    .map((line) => {
      let next = line.trimEnd();
      next = next.replace(/subgraph\s+([A-Za-z0-9_]+)\[([^\]"]+)\]/gi, 'subgraph $1["$2"]');
      next = next.replace(
        /(\b[A-Za-z0-9_]+)\[([^\]"\n]+)\](?!\s*\()/g,
        (_, id: string, label: string) => {
          if (label.startsWith('"') || label.includes("(")) return `${id}[${label}]`;
          return `${id}["${label.replace(/"/g, "'")}"]`;
        }
      );
      return next;
    })
    .join("\n");

  return text;
}