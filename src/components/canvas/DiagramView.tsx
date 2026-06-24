"use client";

import { useEffect, useRef } from "react";
import { Network } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function DiagramView() {
  const { diagram } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!diagram || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
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
      containerRef.current.innerHTML = svg;
    })();

    return () => {
      cancelled = true;
    };
  }, [diagram]);

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
      <div className="border-b border-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-500">Research diagram</span>
      </div>
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-auto p-8 [&_svg]:max-h-full [&_svg]:max-w-full"
      />
    </div>
  );
}