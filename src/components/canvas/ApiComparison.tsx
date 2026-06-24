"use client";

import { Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { ComparisonScorecard } from "@/types";

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px]">
        <span className="text-zinc-500">{label}</span>
        <span className="font-medium text-zinc-400">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full"
          style={{ width: `${value * 10}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ScorecardGrid({ scores }: { scores: ComparisonScorecard }) {
  return (
    <div className="space-y-2.5">
      <ScoreBar label="Ease of use" value={scores.easeOfUse} color="#3b82f6" />
      <ScoreBar
        label="Documentation"
        value={scores.documentation}
        color="#8b5cf6"
      />
      <ScoreBar label="Flexibility" value={scores.flexibility} color="#10b981" />
      <ScoreBar
        label="Production readiness"
        value={scores.productionReadiness}
        color="#f59e0b"
      />
    </div>
  );
}

export function ApiComparison() {
  const {
    readyCount,
    comparisons,
    comparisonMeta,
    isComparisonLoading,
    apiKey,
  } = useApp();

  if (readyCount < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-400">Add 2+ resources to compare</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Upload LangChain + Google ADK docs, or Redis + MongoDB + Postgres links.
          A generic overview appears here automatically.
        </p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-400">Gemini key required</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Add your Gemini API key to generate scorecards and side-by-side code.
          Ask in chat for customized comparisons (*&quot;compare MCP setup in ADK vs
          LangChain&quot;*).
        </p>
      </div>
    );
  }

  if (isComparisonLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Generating comparison...</span>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-400">Comparison loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-200">
          {comparisonMeta?.category ?? "Technology"} comparison
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Side-by-side for: {comparisonMeta?.task ?? "getting started"}
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">
          Neutral overview — ask in chat for your specific use case
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {comparisons.map((lib) => (
          <article
            key={lib.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className="mb-4">
              <h4 className="text-base font-semibold text-zinc-100">
                {lib.name}
              </h4>
              <p className="text-[10px] capitalize text-zinc-500">
                {lib.category}
              </p>
            </div>

            <ScorecardGrid scores={lib.scorecard} />

            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Code — same task
              </p>
              <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
                {lib.codeSnippet}
              </pre>
              <span className="mt-1 inline-block font-mono text-[9px] text-zinc-600">
                {lib.codeLanguage}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}