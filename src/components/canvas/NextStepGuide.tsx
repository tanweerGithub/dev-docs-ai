"use client";

import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function NextStepGuide() {
  const { readyCount, hasSynthesized, addMessage, isChatLoading } = useApp();

  if (readyCount === 0 || hasSynthesized) return null;

  const handleSynthesize = () => {
    addMessage("Synthesize an integration with caching and background tasks");
  };

  return (
    <div className="border-b border-blue-500/20 bg-blue-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-blue-500/20 p-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-200">
            {readyCount} resource{readyCount === 1 ? "" : "s"} indexed — ready
            for synthesis
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            The canvas fills when you ask the agent. Use the chat on the right
            to generate code, architecture, and comparisons.
          </p>
          <button
            onClick={handleSynthesize}
            disabled={isChatLoading}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            <MessageSquare className="h-3 w-3" />
            Synthesize integration
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}