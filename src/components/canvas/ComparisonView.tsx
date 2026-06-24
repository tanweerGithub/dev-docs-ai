"use client";

import { GitCompare } from "lucide-react";
import { useApp } from "@/context/AppContext";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px]">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-400">{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

export function ComparisonView() {
  const { comparison } = useApp();

  if (!comparison) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <GitCompare className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">No comparison yet</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Ask in chat — e.g. &ldquo;compare LangChain vs Google ADK for building
          an MCP agent&rdquo; — and a side-by-side view appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-100">
          {comparison.title}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">Task: {comparison.task}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {comparison.items.map((item) => (
          <article
            key={item.name}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <h4 className="mb-4 text-base font-semibold text-zinc-100">
              {item.name}
            </h4>

            <div className="mb-4 space-y-2">
              <ScoreBar label="Ease of use" value={item.scores.easeOfUse} />
              <ScoreBar
                label="Documentation"
                value={item.scores.documentation}
              />
              <ScoreBar label="Flexibility" value={item.scores.flexibility} />
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Code — same task
            </p>
            <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
              {item.codeSnippet}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}