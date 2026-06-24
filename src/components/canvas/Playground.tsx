"use client";

import dynamic from "next/dynamic";
import { ExternalLink, FileText } from "lucide-react";
import { useApp } from "@/context/AppContext";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
      Loading editor...
    </div>
  ),
});

export function Playground() {
  const { codeBlock, highlightedCitation, setHighlightedCitation } = useApp();

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col border-r border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="text-xs font-medium text-zinc-400">
            Synthesized Code
          </span>
          <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
            {codeBlock.language}
          </span>
        </div>
        <div className="flex-1">
          <MonacoEditor
            height="100%"
            language={codeBlock.language}
            value={codeBlock.code}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              renderLineHighlight: "all",
            }}
          />
        </div>
      </div>

      <div className="flex w-80 shrink-0 flex-col bg-zinc-950">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-xs font-semibold text-zinc-300">
            Documentation Citations
          </h3>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            Lines referenced to write this code
          </p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {codeBlock.citations.map((cite) => (
            <button
              key={cite.id}
              onClick={() =>
                setHighlightedCitation(
                  highlightedCitation === cite.id ? null : cite.id
                )
              }
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                highlightedCitation === cite.id
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-200">
                    {cite.resourceName}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-emerald-400">
                    L{cite.lineStart}–{cite.lineEnd}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                    &ldquo;{cite.excerpt}&rdquo;
                  </p>
                  {cite.url && (
                    <a
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      View source <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}