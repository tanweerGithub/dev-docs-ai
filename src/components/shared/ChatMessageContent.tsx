"use client";

import type { ReactNode } from "react";
import type { ChatCitation, Resource } from "@/types";

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-zinc-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[0.9em] text-violet-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic text-zinc-200">
          {token.slice(1, -1)}
        </em>
      );
    }
    last = match.index + token.length;
    i += 1;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes.length > 0 ? nodes : [text];
}

function resolveCitationTarget(
  index: number,
  resources: Resource[],
  citations: ChatCitation[]
) {
  const resource = resources[index];
  const citation =
    citations.find((c) => c.resourceId === resource?.id) ??
    citations[index];

  return { resource, citation };
}

const INLINE_CITATION_PATTERN = /(\[\d+(?:\s*,?\s*p\.?\s*\d+)?\])/gi;

function formatCitationChip(
  sourceIndex: number,
  page: number | undefined,
  label: string
) {
  const pageLabel = page ? ` · p.${page}` : "";
  return `[${sourceIndex}${pageLabel}] ${label}`;
}

function renderBlock(
  content: string,
  resources: Resource[],
  citations: ChatCitation[],
  onOpenDocument: (resourceId: string) => void,
  blockKey: string
): ReactNode {
  const parts = content.split(INLINE_CITATION_PATTERN);

  return parts.map((part, i) => {
    const refMatch = part.match(/^\[(\d+)(?:\s*,?\s*p\.?\s*(\d+))?\]$/i);
    if (refMatch) {
      const idx = Number(refMatch[1]) - 1;
      const inlinePage = refMatch[2] ? Number(refMatch[2]) : undefined;
      const { resource, citation } = resolveCitationTarget(
        idx,
        resources,
        citations
      );
      const page = inlinePage ?? citation?.page;
      const label =
        resource?.name ?? citation?.label ?? `Source ${idx + 1}`;
      const title = [
        label,
        page ? `Page ${page}` : null,
        citation?.excerpt,
      ]
        .filter(Boolean)
        .join(" — ");

      const chip = formatCitationChip(Number(refMatch[1]), page, label);

      if (resource?.id) {
        return (
          <button
            key={`${blockKey}-ref-${i}`}
            type="button"
            title={title}
            onClick={() => onOpenDocument(resource.id)}
            className="mx-0.5 inline-flex cursor-pointer items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[0.85em] font-medium text-emerald-300 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/25 hover:text-emerald-200"
          >
            {chip}
          </button>
        );
      }

      if (citation?.url) {
        return (
          <a
            key={`${blockKey}-ref-${i}`}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            className="mx-0.5 inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-[0.85em] font-medium text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-200"
          >
            {chip}
          </a>
        );
      }

      return (
        <span
          key={`${blockKey}-ref-${i}`}
          title={title}
          className="mx-0.5 inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 text-[0.85em] font-medium text-zinc-400"
        >
          {chip}
        </span>
      );
    }

    return (
      <span key={`${blockKey}-t-${i}`}>
        {renderInlineMarkdown(part, `${blockKey}-t-${i}`)}
      </span>
    );
  });
}

export function ChatMessageContent({
  content,
  resources,
  citations = [],
  onOpenDocument,
}: {
  content: string;
  resources: Resource[];
  citations?: ChatCitation[];
  onOpenDocument: (resourceId: string) => void;
}) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const isList = lines.every(
          (line) => line.trim() === "" || /^[-*]\s+/.test(line.trim())
        );

        if (isList && lines.some((line) => /^[-*]\s+/.test(line.trim()))) {
          return (
            <ul
              key={`block-${blockIndex}`}
              className="list-disc space-y-1.5 pl-5"
            >
              {lines
                .filter((line) => line.trim())
                .map((line, lineIndex) => {
                  const item = line.replace(/^[-*]\s+/, "");
                  return (
                    <li key={`block-${blockIndex}-li-${lineIndex}`}>
                      {renderBlock(
                        item,
                        resources,
                        citations,
                        onOpenDocument,
                        `block-${blockIndex}-li-${lineIndex}`
                      )}
                    </li>
                  );
                })}
            </ul>
          );
        }

        const heading = block.match(/^(#{1,3})\s+(.+)$/);
        if (heading && lines.length === 1) {
          const level = heading[1].length;
          const text = heading[2];
          const className =
            level === 1
              ? "text-base font-semibold text-zinc-100"
              : level === 2
                ? "text-sm font-semibold text-zinc-100"
                : "text-sm font-medium text-zinc-200";

          return (
            <p key={`block-${blockIndex}`} className={className}>
              {renderBlock(
                text,
                resources,
                citations,
                onOpenDocument,
                `block-${blockIndex}-h`
              )}
            </p>
          );
        }

        return (
          <p key={`block-${blockIndex}`} className="whitespace-pre-wrap">
            {lines.map((line, lineIndex) => (
              <span key={`block-${blockIndex}-line-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderBlock(
                  line,
                  resources,
                  citations,
                  onOpenDocument,
                  `block-${blockIndex}-line-${lineIndex}`
                )}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}