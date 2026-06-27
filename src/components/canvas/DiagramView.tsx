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
const BUTTON_ZOOM_STEP = 0.12;
const WHEEL_ZOOM_SENSITIVITY = 0.0012;
const WHEEL_ZOOM_MAX_DELTA = 0.04;
const VIEWPORT_PADDING = 40;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

function getSvgDimensions(svg: SVGSVGElement): { width: number; height: number } {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const width = parseFloat(svg.getAttribute("width") ?? "0");
  const height = parseFloat(svg.getAttribute("height") ?? "0");
  if (width > 0 && height > 0) return { width, height };
  const rect = svg.getBoundingClientRect();
  return { width: rect.width || 800, height: rect.height || 600 };
}

function prepareSvgElement(svg: SVGSVGElement) {
  svg.style.maxWidth = "none";
  svg.style.display = "block";
  const { width, height } = getSvgDimensions(svg);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
}

export function DiagramView() {
  const { diagram, diagramMeta, apiKey } = useApp();
  const { isLight } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fixAttemptedRef = useRef<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );
  const svgSizeRef = useRef({ width: 800, height: 600 });

  const [activeDiagram, setActiveDiagram] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const fitToView = useCallback(() => {
    const svg = containerRef.current?.querySelector("svg") as SVGSVGElement | null;
    const viewport = viewportRef.current;
    if (!svg || !viewport) return;

    prepareSvgElement(svg);
    const { width, height } = getSvgDimensions(svg);
    svgSizeRef.current = { width, height };

    const zoomW = (viewport.clientWidth - VIEWPORT_PADDING) / width;
    const zoomH = (viewport.clientHeight - VIEWPORT_PADDING) / height;
    const fitZoom = clampZoom(Math.min(zoomW, zoomH));

    setZoom(fitZoom);
    setPan({
      x: (viewport.clientWidth - width * fitZoom) / 2,
      y: (viewport.clientHeight - height * fitZoom) / 2,
    });
  }, []);

  useEffect(() => {
    setActiveDiagram(diagram);
    setZoom(1);
    setPan({ x: 0, y: 0 });
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
              const svgEl = containerRef.current.querySelector("svg");
              if (svgEl) prepareSvgElement(svgEl as SVGSVGElement);
              requestAnimationFrame(() => {
                if (!cancelled) fitToView();
              });
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
  }, [activeDiagram, isLight, apiKey, diagramMeta?.query, fitToView]);

  useEffect(() => {
    const onResize = () => fitToView();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitToView]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPan({
        x: dragRef.current.panX + (e.clientX - dragRef.current.x),
        y: dragRef.current.panY + (e.clientY - dragRef.current.y),
      });
    };

    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button !== 0 || renderError || fixing) return;
    e.preventDefault();
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
  };

  const zoomAtCenter = useCallback(
    (delta: number) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        setZoom((z) => clampZoom(z + delta));
        return;
      }

      const cx = viewport.clientWidth / 2;
      const cy = viewport.clientHeight / 2;
      setZoom((prevZoom) => {
        const nextZoom = clampZoom(prevZoom + delta);
        if (nextZoom === prevZoom) return prevZoom;
        const scale = nextZoom / prevZoom;
        setPan((prevPan) => ({
          x: cx - (cx - prevPan.x) * scale,
          y: cy - (cy - prevPan.y) * scale,
        }));
        return nextZoom;
      });
    },
    []
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const raw = -e.deltaY * WHEEL_ZOOM_SENSITIVITY;
      const delta =
        Math.sign(raw) *
        Math.min(Math.abs(raw), WHEEL_ZOOM_MAX_DELTA);
      if (Math.abs(delta) < 0.002) return;
      zoomAtCenter(delta);
    },
    [zoomAtCenter]
  );

  const getSvg = () =>
    containerRef.current?.querySelector("svg") as SVGSVGElement | null;

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
          {fixing
            ? "Repairing diagram…"
            : "Drag to pan · scroll to zoom"}
        </span>
        {!renderError && !fixing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => zoomAtCenter(-BUTTON_ZOOM_STEP)}
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
              onClick={() => zoomAtCenter(BUTTON_ZOOM_STEP)}
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
          ref={viewportRef}
          onWheel={handleWheel}
          onMouseDown={handlePanStart}
          className={`relative flex-1 overflow-hidden bg-zinc-950/30 ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <div
            className="absolute left-0 top-0 will-change-transform"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <div
              ref={containerRef}
              className="[&_svg]:block [&_svg]:max-w-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}