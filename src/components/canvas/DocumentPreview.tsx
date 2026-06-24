"use client";

import { ExternalLink, FileText, Globe } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function DocumentPreview() {
  const { resources, selectedId } = useApp();
  const resource = resources.find((r) => r.id === selectedId);

  if (!resource) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FileText className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">Select a document to preview</p>
        <p className="max-w-xs text-xs text-zinc-600">
          Add a link or PDF on the left, then click it to read here.
        </p>
      </div>
    );
  }

  if (resource.type === "pdf" && resource.previewUrl) {
    return (
      <div className="flex h-full flex-col bg-zinc-950">
        <PreviewHeader resource={resource} />
        <iframe
          src={resource.previewUrl}
          title={resource.name}
          className="min-h-0 flex-1 border-0 bg-white"
        />
      </div>
    );
  }

  if (resource.type === "url" && resource.url) {
    return (
      <div className="flex h-full flex-col bg-zinc-950">
        <PreviewHeader resource={resource} />
        <iframe
          src={resource.url}
          title={resource.name}
          className="min-h-0 flex-1 border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
        <p className="border-t border-zinc-800 px-4 py-2 text-center text-[10px] text-zinc-600">
          Some sites block embedding — use &ldquo;Open original&rdquo; above if
          the preview is blank.
        </p>
      </div>
    );
  }

  return null;
}

function PreviewHeader({
  resource,
}: {
  resource: { name: string; type: string; url?: string };
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {resource.type === "pdf" ? (
          <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        )}
        <span className="truncate text-xs font-medium text-zinc-300">
          {resource.name}
        </span>
      </div>
      {resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
        >
          Open original <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}