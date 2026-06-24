"use client";

import { Check, Copy, ExternalLink, GitCompare } from "lucide-react";
import { useState } from "react";
import { ArtifactBanner } from "@/components/shared/ArtifactBanner";
import { useApp } from "@/context/AppContext";
import { openInColab } from "@/lib/colab";
import type { ComparisonItem } from "@/types";

function orderItems(items: ComparisonItem[]): ComparisonItem[] {
  const langchain = items.find((i) =>
    i.name.toLowerCase().includes("langchain")
  );
  const adk = items.find(
    (i) =>
      i.name.toLowerCase().includes("adk") ||
      i.name.toLowerCase().includes("google")
  );
  const rest = items.filter((i) => i !== langchain && i !== adk);
  return [...(langchain ? [langchain] : []), ...(adk ? [adk] : []), ...rest];
}

function CodePanel({ item }: { item: ComparisonItem }) {
  const [copied, setCopied] = useState(false);
  const isPython = item.codeLanguage.toLowerCase().includes("py");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-zinc-800 xl:border-r xl:last:border-r-0">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h4 className="text-sm font-semibold text-zinc-100">{item.name}</h4>
        <div className="flex items-center gap-1">
          {isPython && (
            <button
              onClick={() => openInColab(item.codeSnippet, item.codeLanguage)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              <ExternalLink className="h-3 w-3" />
              Colab
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
        {item.codeSnippet}
      </pre>
    </div>
  );
}

export function ComparisonView() {
  const { comparison, comparisonMeta } = useApp();

  if (!comparison) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <GitCompare className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">No comparison yet</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Ask in chat — e.g. &ldquo;Show me how to create an agent in LangChain
          and Google ADK&rdquo; — and both code snippets appear here side by side.
        </p>
      </div>
    );
  }

  const items = orderItems(comparison.items);

  return (
    <div className="flex h-full flex-col">
      <ArtifactBanner meta={comparisonMeta} />
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4">
        <h3 className="text-sm font-semibold text-zinc-100">
          {comparison.title}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Same task: {comparison.task}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        {items.map((item) => (
          <CodePanel key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}