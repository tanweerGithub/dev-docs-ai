"use client";

import { useState } from "react";
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
  const { resources, addResource, removeResource } = useApp();
  const [mode, setMode] = useState<InputMode>("docs");
  const [inputValue, setInputValue] = useState("");

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

  const handlePdfUpload = () => {
    const name = `Document-${Date.now()}.pdf`;
    addResource({ type: "pdf", name });
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
          Resource Ingestion
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Upload docs, links, or repos to index
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
          <button
            onClick={handlePdfUpload}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-6 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs font-medium">Drop PDF or click to upload</span>
            <span className="text-[10px] text-zinc-600">Max 50 MB per file</span>
          </button>
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

        {resources.length === 0 && (
          <div className="mb-3 rounded-lg border border-dashed border-zinc-800 p-3">
            <p className="mb-2 text-[10px] text-zinc-500">Quick-add demo stack:</p>
            <div className="flex flex-col gap-1.5">
              {[
                {
                  type: "github" as const,
                  name: "fastapi/fastapi",
                  url: "https://github.com/fastapi/fastapi",
                },
                {
                  type: "docs" as const,
                  name: "Redis Python Client",
                  url: "https://redis.io/docs/latest/develop/clients/redis-py/",
                },
                {
                  type: "docs" as const,
                  name: "Celery Documentation",
                  url: "https://docs.celeryq.dev/en/stable/",
                },
              ].map((item) => (
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
            return (
              <li
                key={resource.id}
                className="group rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded-md bg-zinc-800 p-1.5">
                    <Icon className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-200">
                      {resource.name}
                    </p>
                    {resource.url && (
                      <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                        {resource.url}
                      </p>
                    )}
                    {resource.summary && resource.status === "ready" && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                        {resource.summary}
                      </p>
                    )}
                    {resource.detectedLibraries &&
                      resource.detectedLibraries.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {resource.detectedLibraries.map((lib) => (
                            <span
                              key={lib}
                              className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] capitalize text-zinc-400"
                            >
                              {lib}
                            </span>
                          ))}
                        </div>
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
                  <button
                    onClick={() => removeResource(resource.id)}
                    className="rounded p-1 text-zinc-600 opacity-0 transition-all hover:bg-zinc-800 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}