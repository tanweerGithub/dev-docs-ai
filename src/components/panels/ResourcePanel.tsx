"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Globe,
  Link2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function ResourcePanel() {
  const { resources, addUrl, addPdf, removeResource, selectResource, selectedId } =
    useApp();
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    addUrl(urlInput);
    setUrlInput("");
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <h2 className="text-sm font-semibold text-zinc-100">Sources</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Add links or PDFs — no processing until you chat
        </p>
      </div>

      <div className="space-y-2 border-b border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            placeholder="https://docs.example.com"
            className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
            className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-500 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addPdf(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 py-2.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {resources.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-600">
            No sources yet
          </p>
        ) : (
          <ul className="space-y-1.5">
            {resources.map((r) => {
              const Icon = r.type === "pdf" ? FileText : Globe;
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

      <div className="border-t border-zinc-800 p-3">
        <p className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <Link2 className="h-3 w-3" />
          {resources.length} source{resources.length === 1 ? "" : "s"} · sent
          to Gemini on query
        </p>
      </div>
    </aside>
  );
}