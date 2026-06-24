"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Globe, ImageIcon, Loader2 } from "lucide-react";
import { detectBlockedFromIframe } from "@/lib/embed-check";
import { useApp } from "@/context/AppContext";
import type { Resource } from "@/types";

type EmbedState = "loading" | "embedded" | "blocked";

export function DocumentPreview() {
  const { resources, selectedId } = useApp();
  const resource = resources.find((r) => r.id === selectedId);

  if (!resource) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FileText className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">Select a document to preview</p>
        <p className="max-w-xs text-xs text-zinc-600">
          Add a link or upload files on the left, then click a source to view
          it here.
        </p>
      </div>
    );
  }

  if (resource.type === "url" && resource.url) {
    return <UrlPreview resource={resource} />;
  }

  if (resource.type === "file") {
    return <FilePreview resource={resource} />;
  }

  return null;
}

function UrlPreview({ resource }: { resource: Resource }) {
  const url = resource.url!;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const headerBlockedRef = useRef<boolean | null>(null);
  const blockReasonRef = useRef(
    "This site does not allow embedded previews."
  );
  const iframeLoadedRef = useRef(false);

  const [embedState, setEmbedState] = useState<EmbedState>("loading");
  const [blockReason, setBlockReason] = useState(
    "This site does not allow embedded previews."
  );

  const markBlocked = useCallback((reason: string) => {
    blockReasonRef.current = reason;
    setBlockReason(reason);
    setEmbedState("blocked");
  }, []);

  const markEmbedded = useCallback(() => {
    setEmbedState("embedded");
  }, []);

  const evaluateEmbed = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeLoadedRef.current) return;

    if (detectBlockedFromIframe(iframe)) {
      markBlocked(
        "This page cannot be displayed in an embedded preview. The site may block iframe embedding."
      );
      return;
    }

    if (headerBlockedRef.current === true) {
      markBlocked(blockReasonRef.current);
      return;
    }

    markEmbedded();
  }, [markBlocked, markEmbedded]);

  useEffect(() => {
    headerBlockedRef.current = null;
    iframeLoadedRef.current = false;
    setEmbedState("loading");

    let cancelled = false;

    fetch(`/api/embed-check?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data: { embeddable: string; reason?: string }) => {
        if (cancelled) return;

        if (data.embeddable === "no") {
          headerBlockedRef.current = true;
          if (data.reason) {
            blockReasonRef.current = data.reason;
            setBlockReason(data.reason);
          }
          if (iframeLoadedRef.current) evaluateEmbed();
        } else {
          headerBlockedRef.current = false;
          if (iframeLoadedRef.current) evaluateEmbed();
        }
      })
      .catch(() => {
        if (!cancelled) headerBlockedRef.current = null;
      });

    const slowLoadTimer = window.setTimeout(() => {
      if (cancelled || iframeLoadedRef.current) return;
      markBlocked(
        "This preview is taking too long to load. The site may block embedding or require opening in a new tab."
      );
    }, 12000);

    return () => {
      cancelled = true;
      window.clearTimeout(slowLoadTimer);
    };
  }, [url, evaluateEmbed, markBlocked]);

  const handleIframeLoad = () => {
    iframeLoadedRef.current = true;
    window.setTimeout(evaluateEmbed, 400);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <PreviewHeader resource={resource} />

      {embedState === "blocked" ? (
        <BlockedFallback
          name={resource.name}
          url={url}
          reason={blockReason}
          onRetry={() => {
            headerBlockedRef.current = null;
            iframeLoadedRef.current = false;
            setEmbedState("loading");
            if (iframeRef.current) {
              iframeRef.current.src = url;
            }
          }}
        />
      ) : (
        <div className="relative min-h-0 flex-1">
          {embedState === "loading" && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 border-b border-zinc-800 bg-zinc-950/90 px-4 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
              <span className="text-[11px] text-zinc-500">Loading preview…</span>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={url}
            title={resource.name}
            onLoad={handleIframeLoad}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  );
}

function BlockedFallback({
  name,
  url,
  reason,
  onRetry,
}: {
  name: string;
  url: string;
  reason: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <Globe className="mx-auto h-10 w-10 text-zinc-600" />
      </div>
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium text-zinc-200">{name}</p>
        <p className="text-xs text-zinc-500">{reason}</p>
        <p className="text-xs text-zinc-600">
          You can still research this URL in chat — Gemini reads the page
          directly. To read it yourself, open it in your browser.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Open in browser
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          onClick={onRetry}
          className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
        >
          Retry preview
        </button>
      </div>
      <p className="max-w-sm truncate text-[10px] text-zinc-600">{url}</p>
    </div>
  );
}

function FilePreview({ resource }: { resource: Resource }) {
  const mime = resource.mimeType ?? "";

  if (mime === "application/pdf" && resource.previewUrl) {
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

  if (mime.startsWith("image/") && resource.previewUrl) {
    return (
      <div className="flex h-full flex-col bg-zinc-950">
        <PreviewHeader resource={resource} />
        <div className="flex flex-1 items-center justify-center overflow-auto bg-zinc-900 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resource.previewUrl}
            alt={resource.name}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      </div>
    );
  }

  if (
    (mime.startsWith("text/") || mime === "text/csv") &&
    resource.previewUrl
  ) {
    return <TextFilePreview resource={resource} />;
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <PreviewHeader resource={resource} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <FileText className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">{resource.name}</p>
        <p className="text-xs text-zinc-600">
          Preview not available for this file type. Gemini can still read it in
          chat.
        </p>
      </div>
    </div>
  );
}

function TextFilePreview({ resource }: { resource: Resource }) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!resource.previewUrl) return;
    let cancelled = false;
    fetch(resource.previewUrl)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setContent("Unable to load file preview.");
      });
    return () => {
      cancelled = true;
    };
  }, [resource.previewUrl]);

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <PreviewHeader resource={resource} />
      <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-300">
        {content ?? "Loading…"}
      </pre>
    </div>
  );
}

function PreviewHeader({ resource }: { resource: Resource }) {
  const Icon =
    resource.type === "file" && resource.mimeType?.startsWith("image/")
      ? ImageIcon
      : resource.type === "file"
        ? FileText
        : Globe;

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
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
          Open in browser <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}