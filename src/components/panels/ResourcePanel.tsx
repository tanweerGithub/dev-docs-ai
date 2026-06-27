"use client";

import { useRef, useState } from "react";
import {
  ChevronUp,
  FileText,
  Globe,
  ImageIcon,
  Link2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { DEMO_LIST, type DemoId } from "@/data/demos";
import { useApp } from "@/context/AppContext";
import type { Resource } from "@/types";

const FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.txt,.md,.html,.csv";

function resourceIcon(r: Resource) {
  if (r.type === "url") return Globe;
  if (r.mimeType?.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function ResourcePanel() {
  const {
    resources,
    addUrl,
    addFile,
    removeResource,
    clearAllResources,
    selectResource,
    selectedId,
    loadDemo,
  } = useApp();
  const [urlInput, setUrlInput] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAddUrl = async () => {
    if (!urlInput.trim() || addingUrl) return;
    setAddingUrl(true);
    try {
      await addUrl(urlInput);
      setUrlInput("");
    } finally {
      setAddingUrl(false);
    }
  };

  return (
    <aside className="relative flex h-full w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Sources</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Documentation links or uploaded files
            </p>
          </div>
          {resources.length > 0 && (
            <button
              type="button"
              onClick={clearAllResources}
              className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 border-b border-zinc-800 p-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            <Link2 className="h-3 w-3" />
            Documentation link
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              placeholder="https://redis.io/docs/..."
              className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => void handleAddUrl()}
              disabled={!urlInput.trim() || addingUrl}
              className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-500 disabled:opacity-40"
              title="Add documentation link"
            >
              <Plus className={`h-4 w-4 ${addingUrl ? "animate-pulse" : ""}`} />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-zinc-600">
            Add multiple links — each one stacks in your sources
          </p>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            <Upload className="h-3 w-3" />
            Upload files
          </label>
          <input
            ref={fileRef}
            type="file"
            accept={FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                Array.from(files).forEach((file) => addFile(file));
              }
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 py-2.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload files
          </button>
          <p className="mt-1.5 text-[10px] text-zinc-600">
            PDF, images, text — whatever Gemini supports
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-14">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Your sources ({resources.length})
        </p>
        {resources.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-600">
            Add a link, upload files, or try a demo below
          </p>
        ) : (
          <ul className="space-y-1.5">
            {resources.map((r) => {
              const Icon = resourceIcon(r);
              const selected = selectedId === r.id;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => selectResource(r.id)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                      selected
                        ? "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeResource(r.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          removeResource(r.id);
                        }
                      }}
                      className="shrink-0 rounded p-0.5 opacity-0 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={() => setDemoOpen((o) => !o)}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-900/50"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Try a demo
          </span>
          <ChevronUp
            className={`h-4 w-4 text-zinc-500 transition-transform ${demoOpen ? "rotate-180" : ""}`}
          />
        </button>

        {demoOpen && (
          <div className="space-y-1.5 border-t border-zinc-800/80 px-3 pb-3 pt-2">
            {DEMO_LIST.map((demo) => (
              <button
                key={demo.id}
                onClick={() => {
                  loadDemo(demo.id as DemoId);
                  setDemoOpen(false);
                }}
                className="w-full cursor-pointer rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-left transition-colors hover:border-violet-500/40 hover:bg-violet-500/10"
              >
                <span className="text-xs font-medium text-zinc-200">
                  {demo.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  {demo.description}
                </span>
              </button>
            ))}
            <p className="px-1 pt-1 text-[10px] text-zinc-600">
              Compare loads LangChain + Google ADK side by side.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}