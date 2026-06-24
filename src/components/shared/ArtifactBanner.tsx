"use client";

import { History } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { ArtifactMeta } from "@/types";

function truncate(text: string, max = 72): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export function ArtifactBanner({ meta }: { meta: ArtifactMeta | null }) {
  const { selectedId, resources } = useApp();

  if (!meta) return null;

  const activeDoc = resources.find((r) => r.id === selectedId);
  const matchesActiveDoc =
    !selectedId || meta.sourceIds.length === 0
      ? true
      : meta.sourceIds.includes(selectedId);

  return (
    <div className="flex items-start gap-2 border-b border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
      <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <div className="min-w-0 text-[11px] leading-relaxed text-zinc-400">
        <p>
          <span className="text-zinc-500">From chat:</span>{" "}
          <span className="text-zinc-300">{truncate(meta.query)}</span>
        </p>
        <p className="mt-0.5">
          <span className="text-zinc-500">Sources:</span> {meta.sourceLabel}
        </p>
        {!matchesActiveDoc && activeDoc && (
          <p className="mt-1 text-amber-400/90">
            You selected {activeDoc.name} — this content is from a previous
            query. Switch tabs freely; select a source to read its document.
          </p>
        )}
      </div>
    </div>
  );
}