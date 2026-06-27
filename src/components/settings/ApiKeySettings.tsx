"use client";

import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { maskApiKey } from "@/lib/api-key-storage";
import { useApp } from "@/context/AppContext";

export function ApiKeySettings() {
  const { apiKey, setApiKey } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleSave = () => {
    if (!input.trim()) return;
    setApiKey(input);
    setInput("");
    setOpen(false);
  };

  const handleClear = () => {
    setApiKey(null);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
          apiKey
            ? "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
            : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
        }`}
      >
        <KeyRound className="h-3 w-3" />
        {apiKey ? `Gemini: ${maskApiKey(apiKey)}` : "Add Gemini key"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">
                Gemini API Key
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              Stored locally in your browser only. Powers doc-grounded chat and
              code generation. Get a key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                aistudio.google.com
              </a>
              .
            </p>

            {apiKey && (
              <p className="mb-2 text-[10px] text-emerald-400/90">
                Saved: {maskApiKey(apiKey)} — paste a new key below to replace it
              </p>
            )}

            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={apiKey ? "Paste new key to replace…" : "AIza..."}
              autoComplete="off"
              className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!input.trim()}
                className="flex-1 rounded-lg bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
              >
                Save key
              </button>
              {apiKey && (
                <button
                  onClick={handleClear}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}