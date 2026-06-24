"use client";

import { ExternalLink, FileText } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function DocumentReader() {
  const { resources, selectedResourceId } = useApp();

  const resource = resources.find((r) => r.id === selectedResourceId);

  if (!resource) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <FileText className="h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-400">Select a document to read</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Click any indexed resource on the left to view its content here.
        </p>
      </div>
    );
  }

  const body = resource.content ?? resource.summary ?? "No content extracted yet.";

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-zinc-100">
              {resource.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] capitalize text-zinc-400">
                {resource.type}
              </span>
              {resource.category && (
                <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400">
                  {resource.category}
                </span>
              )}
              <span
                className={`rounded px-2 py-0.5 text-[10px] ${
                  resource.status === "ready"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {resource.status}
              </span>
            </div>
          </div>
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
            >
              Open source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {resource.summary && resource.content && (
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            {resource.summary}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
          {body}
        </pre>
      </div>
    </div>
  );
}