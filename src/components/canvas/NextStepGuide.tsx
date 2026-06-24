"use client";

import { ArrowRight, MessageSquare, RefreshCw, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function NextStepGuide() {
  const {
    readyCount,
    hasSynthesized,
    needsResynthesis,
    addMessage,
    isChatLoading,
    apiKey,
  } = useApp();

  if (readyCount === 0 || !needsResynthesis) return null;

  const isResynth = hasSynthesized;

  const handleAction = () => {
    if (apiKey) {
      addMessage(
        "Generate code from my indexed documentation. Use all ready resources and cite your sources."
      );
    } else {
      addMessage("Synthesize an integration with caching and background tasks");
    }
  };

  return (
    <div className="border-b border-blue-500/20 bg-blue-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-blue-500/20 p-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-200">
            {isResynth
              ? `New docs added — re-generate code (${readyCount} resources)`
              : `${readyCount} resource${readyCount === 1 ? "" : "s"} indexed — ready`}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {apiKey
              ? "Ask anything in chat (e.g. “help me build a Redis client”) — code lands in Playground with doc citations."
              : "Add your Gemini API key for doc-grounded answers, or use the button below for template synthesis."}
          </p>
          <button
            onClick={handleAction}
            disabled={isChatLoading}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            {isResynth ? (
              <RefreshCw className="h-3 w-3" />
            ) : (
              <MessageSquare className="h-3 w-3" />
            )}
            {apiKey
              ? isResynth
                ? "Re-generate from docs"
                : "Generate from docs"
              : "Synthesize integration"}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}