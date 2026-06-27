"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Network } from "lucide-react";
import { ArtifactBanner } from "@/components/shared/ArtifactBanner";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";

export function DiagramView() {
  const { diagram, diagramMeta } = useApp();
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!diagram || !containerRef.current) return;

    let cancelled = false;
    setRenderError(null);

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isLight ? "neutral" : "dark",
          themeVariables: isLight
            ? {
                primaryColor: "#dbeafe",
                primaryTextColor: "#18181b",
                lineColor: "#a1a1aa",
                secondaryColor: "#f4f4f5",
                tertiaryColor: "#e4e4e7",
              }
            : {
                primaryColor: "#3b82f6",
                primaryTextColor: "#e4e4e7",
                lineColor: "#52525b",
                secondaryColor: "#18181b",
                tertiaryColor: "#27272a",
              },
        });

        if (cancelled || !containerRef.current) return;

        const id = `mmd-${Date.now()}`;
        const { svg } = await mermaid.render(id, diagram);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setRenderError(
            err instanceof Error ? err.message : "Failed to render diagram"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [diagram, isLight]);

  if (!diagram) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Network className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">No diagram yet</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Ask in chat — e.g. &ldquo;draw an architecture diagram of how these
          libraries connect&rdquo; — and a visual map appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ArtifactBanner meta={diagramMeta} />
      <div className="border-b border-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-500">Research diagram</span>
      </div>
      {renderError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-amber-400" />
          <p className="text-sm text-zinc-400">Could not render this diagram</p>
          <p className="max-w-md text-xs text-zinc-600">{renderError}</p>
          <pre className="max-h-40 max-w-full overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left font-mono text-[10px] text-zinc-500">
            {diagram}
          </pre>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex flex-1 items-center justify-center overflow-auto p-8 [&_svg]:max-h-full [&_svg]:max-w-full"
        />
      )}
    </div>
  );
}