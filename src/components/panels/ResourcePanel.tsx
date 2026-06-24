"use client";

import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  FolderGit2,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { DEMO_STACK } from "@/data/demo-stack";
import { useApp } from "@/context/AppContext";
import type { ResourceType } from "@/types";

const TYPE_ICONS = {
  pdf: FileText,
  docs: BookOpen,
  github: FolderGit2,
} as const;

const STATUS_STYLES = {
  pending: "bg-zinc-700 text-zinc-300",
  indexing: "bg-amber-500/20 text-amber-400",
  ready: "bg-emerald-500/20 text-emerald-400",
  error: "bg-red-500/20 text-red-400",
} as const;

type InputMode = "docs" | "github" | "pdf";

export function ResourcePanel() {
  const { resources, addResource, removeResource, selectResource, selectedResourceId } =
    useApp();
  const [mode, setMode] = useState<InputMode>("docs");
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingDemoItems = useMemo(() => {
    const addedUrls = new Set(resources.map((r) => r.url).filter(Boolean));
    return DEMO_STACK.filter((item) => !addedUrls.has(item.url));
  }, [resources]);

  const handleAdd = () => {
    if (mode === "pdf") return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const type: ResourceType = mode === "github" ? "github" : "docs";
    let name = trimmed;
    try {
      name =
        mode === "github"
          ? trimmed.replace(/https?:\/\/(www\.)?github\.com\//, "")
          : new URL(trimmed).hostname + new URL(trimmed).pathname.slice(0, 40);
    } catch {
      name = trimmed.slice(0, 48);
    }

    addResource({ type, name, url: trimmed });
    setInputValue("");
  };

  const handlePdfSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      addResource({ type: "pdf", name: file.name }, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
          Resource Ingestion
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Click a resource to read it in the center
        </p>
      </div>

      <div className="flex gap-1 border-b border-zinc-800 p-2">
        {(
          [
            { id: "docs" as const, label: "Docs", icon: Link2 },
            { id: "github" as const, label: "GitHub", icon: FolderGit2 },
            { id: "pdf" as const, label: "PDF", icon: Upload },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
              mode === id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="border-b border-zinc-800 p-3">
        {mode === "pdf" ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePdfSelect(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-6 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs font-medium">Upload PDF</span>
              <span className="text-[10px] text-zinc-600">Text extracted for reading & chat</span>
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={
                mode === "github"
                  ? "https://github.com/org/repo"
                  : "https://docs.example.com/api"
              }
              className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!inputValue.trim()}
              className="flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-zinc-100 transition-colors hover:bg-blue-500 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Indexed ({resources.length})
          </span>
        </div>

        {remainingDemoItems.length > 0 && (
          <div className="mb-3 rounded-lg border border-dashed border-zinc-800 p-3">
            <p className="mb-2 text-[10px] text-zinc-500">Quick-add demo stack:</p>
            <div className="flex flex-col gap-1.5">
              {remainingDemoItems.map((item) => (
                <button
                  key={item.url}
                  onClick={() => addResource(item)}
                  className="rounded-md bg-zinc-900 px-2 py-1.5 text-left text-[10px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {resources.map((resource) => {
            const Icon = TYPE_ICONS[resource.type];
            const isSelected = selectedResourceId === resource.id;
            return (
              <li key={resource.id}>
                <button
                  onClick={() => selectResource(resource.id)}
                  className={`group w-full rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-md bg-zinc-800 p-1.5">
                      <Icon className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-200">
                        {resource.name}
                      </p>
                      {resource.category && (
                        <p className="mt-0.5 text-[10px] capitalize text-violet-400/80">
                          {resource.category}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[resource.status]}`}
                        >
                          {resource.status === "indexing" && (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          )}
                          {resource.status}
                        </span>
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeResource(resource.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          removeResource(resource.id);
                        }
                      }}
                      className="rounded p-1 text-zinc-600 opacity-0 transition-all hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}