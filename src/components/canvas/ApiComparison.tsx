"use client";

import { ExternalLink } from "lucide-react";
import { useApp } from "@/context/AppContext";

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
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ApiComparison() {
  const { comparisons, readyCount } = useApp();

  if (readyCount === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-400">No comparisons yet</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Add resources from the demo stack on the left, then ask the agent to
          compare queue libraries.
        </p>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-zinc-400">Queue library comparison locked</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Add Celery docs (included in the demo stack) or synthesize an
          integration, then ask the agent to compare alternatives.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-200">
          Task Queue Libraries
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Compare speed, license, and integration ease across alternatives
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {comparisons.map((lib, idx) => (
          <article
            key={lib.id}
            className={`rounded-xl border bg-zinc-900/50 p-5 ${
              idx === 0
                ? "border-blue-500/40 ring-1 ring-blue-500/20"
                : "border-zinc-800"
            }`}
          >
            {idx === 0 && (
              <span className="mb-3 inline-block rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                Recommended
              </span>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-semibold text-zinc-100">
                  {lib.name}
                </h4>
                <p className="text-xs text-zinc-500">v{lib.version}</p>
              </div>
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {lib.license}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <ScoreBar label="Speed" value={lib.speed} color="#3b82f6" />
              <ScoreBar
                label="Ease of Integration"
                value={lib.easeOfIntegration}
                color="#10b981"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  Pros
                </p>
                <ul className="space-y-1">
                  {lib.pros.map((p) => (
                    <li
                      key={p}
                      className="text-[11px] text-zinc-400 before:mr-1 before:text-emerald-500 before:content-['+']"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                  Cons
                </p>
                <ul className="space-y-1">
                  {lib.cons.map((c) => (
                    <li
                      key={c}
                      className="text-[11px] text-zinc-400 before:mr-1 before:text-red-400 before:content-['−']"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <a
              href={lib.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
            >
              Documentation <ExternalLink className="h-3 w-3" />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}