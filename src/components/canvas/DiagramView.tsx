"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileImage,
  Maximize2,
  Network,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ArtifactBanner } from "@/components/shared/ArtifactBanner";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { getStoredApiKey } from "@/lib/api-key-storage";
import { exportDiagramPdf, exportDiagramPng } from "@/lib/diagram-export";
import { applyLocalMermaidRepairs } from "@/lib/mermaid-sanitize";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export function DiagramView() {
  const { diagram, diagramMeta, apiKey } = useApp();
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fixAttemptedRef = useRef<string | null>(null);
  const [activeDiagram, setActiveDiagram] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  useEffect(() => {
    setActiveDiagram(diagram);
    setZoom(1);
    fixAttemptedRef.current = null;
  }, [diagram]);

  useEffect(() => {
    if (!activeDiagram || !containerRef.current) return;

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
        const repaired = applyLocalMermaidRepairs(activeDiagram);
        const sources = Array.from(
          new Set([activeDiagram, repaired].filter(Boolean))
        );
        let lastError: unknown = null;

        for (const source of sources) {
          try {
            const { svg } = await mermaid.render(
              `${id}-${source.length}`,
              source
            );
            if (!cancelled && containerRef.current) {
              containerRef.current.innerHTML = svg;
            }
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (lastError && !cancelled) {
          const errorMessage =
            lastError instanceof Error
              ? lastError.message
              : "Failed to render diagram";
          const fixKey = activeDiagram.slice(0, 120);
          const effectiveKey = (apiKey ?? getStoredApiKey())?.trim();

          if (
            effectiveKey &&
            fixAttemptedRef.current !== fixKey &&
            !cancelled
          ) {
            fixAttemptedRef.current = fixKey;
            setFixing(true);
            try {
              const res = await fetch("/api/diagram-fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  diagram: activeDiagram,
                  message:
                    diagramMeta?.query ?? "Fix mermaid architecture diagram",
                  parseError: errorMessage,
                  apiKey: effectiveKey,
                }),
              });
              const data = (await res.json()) as {
                diagram?: string;
                error?: string;
              };
              if (data.diagram && !cancelled) {
                setActiveDiagram(data.diagram);
                return;
              }
            } finally {
              if (!cancelled) setFixing(false);
            }
          }

          setRenderError(errorMessage);
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
  }, [activeDiagram, isLight, apiKey, diagramMeta?.query]);

  const clampZoom = (value: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));

  const fitToView = useCallback(() => {
    const svg = containerRef.current?.querySelector("svg");
    const scroll = scrollRef.current;
    if (!svg || !scroll) return;

    const viewBox = svg.viewBox?.baseVal;
    const svgW =
      viewBox?.width ||
      parseFloat(svg.getAttribute("width") ?? "0") ||
      svg.getBoundingClientRect().width ||
      800;
    const svgH =
      viewBox?.height ||
      parseFloat(svg.getAttribute("height") ?? "0") ||
      svg.getBoundingClientRect().height ||
      600;

    const padding = 48;
    const zoomW = (scroll.clientWidth - padding) / svgW;
    const zoomH = (scroll.clientHeight - padding) / svgH;
    setZoom(clampZoom(Math.min(zoomW, zoomH, 1)));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) =>
      clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
    );
  }, []);

  const getSvg = () => containerRef.current?.querySelector("svg") ?? null;

  const handleExportPng = async () => {
    const svg = getSvg();
    if (!svg) return;
    setExporting("png");
    try {
      await exportDiagramPng(svg, "devdocs-diagram.png", {
        background: isLight ? "#ffffff" : "#18181b",
        scale: 2,
      });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    const svg = getSvg();
    if (!svg) return;
    setExporting("pdf");
    try {
      await exportDiagramPdf(svg, "devdocs-diagram.pdf", {
        background: isLight ? "#ffffff" : "#18181b",
        scale: 2,
      });
    } finally {
      setExporting(null);
    }
  };

  if (!diagram && !activeDiagram) {
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
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-500">
          {fixing ? "Repairing diagram…" : "Research diagram"}
        </span>
        {!renderError && !fixing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3rem] text-center text-[10px] tabular-nums text-zinc-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={fitToView}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              title="Fit to view"
              aria-label="Fit to view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1 h-4 w-px bg-zinc-800" />
            <button
              type="button"
              onClick={() => void handleExportPng()}
              disabled={!!exporting}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40"
              title="Download PNG"
            >
              <FileImage className="h-3 w-3" />
              {exporting === "png" ? "…" : "PNG"}
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={!!exporting}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40"
              title="Download PDF"
            >
              <Download className="h-3 w-3" />
              {exporting === "pdf" ? "…" : "PDF"}
            </button>
          </div>
        )}
      </div>
      {renderError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-amber-400" />
          <p className="text-sm text-zinc-400">Could not render this diagram</p>
          <p className="max-w-md text-xs text-zinc-600">{renderError}</p>
          <pre className="max-h-40 max-w-full overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left font-mono text-[10px] text-zinc-500">
            {activeDiagram ?? diagram}
          </pre>
        </div>
      ) : fixing ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Validating and repairing diagram syntax…
        </div>
      ) : (
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex-1 overflow-auto"
          title="Ctrl + scroll to zoom"
        >
          <div
            className="inline-block p-8"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <div
              ref={containerRef}
              className="[&_svg]:block [&_svg]:h-auto [&_svg]:max-w-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}