"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Network, ZoomIn, ZoomOut } from "lucide-react";
import { ArtifactBanner } from "@/components/shared/ArtifactBanner";
import { sanitizeMermaidDiagram } from "@/lib/mermaid-sanitize";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

export function DiagramView({ isActive }: { isActive: boolean }) {
  const { diagram, diagramMeta } = useApp();
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [renderError, setRenderError] = useState<string | null>(null);

  const cleanDiagram = sanitizeMermaidDiagram(diagram);

  useEffect(() => {
    if (!cleanDiagram) return;
    setZoom(1);
    setRenderError(null);
  }, [cleanDiagram]);

  useEffect(() => {
    if (!isActive || !cleanDiagram || !containerRef.current) return;

    let cancelled = false;
    let frame = 0;

    frame = requestAnimationFrame(() => {
      void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          themeVariables: isLight
            ? {
                darkMode: false,
                background: "#fafafa",
                primaryColor: "#dbeafe",
                primaryTextColor: "#18181b",
                primaryBorderColor: "#a1a1aa",
                lineColor: "#71717a",
                secondaryColor: "#f4f4f5",
                tertiaryColor: "#e4e4e7",
                textColor: "#18181b",
                mainBkg: "#fafafa",
                nodeBorder: "#a1a1aa",
                clusterBkg: "#f4f4f5",
                titleColor: "#18181b",
                edgeLabelBackground: "#fafafa",
              }
            : {
                darkMode: true,
                background: "#09090b",
                primaryColor: "#1e3a5f",
                primaryTextColor: "#f4f4f5",
                primaryBorderColor: "#60a5fa",
                lineColor: "#a1a1aa",
                secondaryColor: "#18181b",
                tertiaryColor: "#27272a",
                textColor: "#f4f4f5",
                mainBkg: "#18181b",
                nodeBorder: "#60a5fa",
                clusterBkg: "#27272a",
                titleColor: "#f4f4f5",
                edgeLabelBackground: "#18181b",
                fontSize: "15px",
              },
        });

        if (cancelled || !containerRef.current) return;

        const id = `mmd-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanDiagram);
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        setRenderError(null);

        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          svgEl.removeAttribute("height");
          svgEl.removeAttribute("width");
          svgEl.style.maxWidth = "none";
          svgEl.style.height = "auto";
          svgEl.style.minWidth = "max-content";
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not render diagram";
        setRenderError(message);
        if (containerRef.current) containerRef.current.innerHTML = "";
      }
      })();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [cleanDiagram, isLight, isActive]);

  const adjustZoom = (delta: number) => {
    setZoom((z) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z + delta).toFixed(2))))
    );
  };

  if (!cleanDiagram) {
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
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-sm text-zinc-500">Research diagram</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjustZoom(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="rounded border border-zinc-700 p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] text-center text-xs text-zinc-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => adjustZoom(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="rounded border border-zinc-700 p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {renderError && (
        <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Diagram could not be rendered</p>
            <p className="mt-1 text-amber-200/80">{renderError}</p>
          </div>
        </div>
      )}

      <div
        className={`diagram-scroll min-h-0 flex-1 overflow-auto p-6 ${
          isLight ? "bg-zinc-50" : "bg-zinc-950"
        }`}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          adjustZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        }}
      >
        <div
          className="inline-block min-w-max origin-top-left transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        >
          <div
            ref={containerRef}
            className={
              isLight
                ? "[&_svg_text]:fill-zinc-900 [&_svg_tspan]:fill-zinc-900"
                : "[&_svg_text]:fill-zinc-100 [&_svg_tspan]:fill-zinc-100 [&_svg_path]:stroke-zinc-300"
            }
          />
        </div>
      </div>
    </div>
  );
}