"use client";

import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import {
  clearStoredApiKey,
  maskApiKey,
  setStoredApiKey,
} from "@/lib/api-key-storage";
import { useApp } from "@/context/AppContext";

export function ApiKeySettings() {
  const { apiKey, setApiKey } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleSave = () => {
    if (!input.trim()) return;
    setStoredApiKey(input);
    setApiKey(input.trim());
    setInput("");
    setOpen(false);
  };

  const handleClear = () => {
    clearStoredApiKey();
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
        {apiKey ? `AI: ${maskApiKey(apiKey)}` : "Add API key"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">
                OpenAI API Key
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              Stored locally in your browser only. Used to power AI chat grounded
              in your indexed documentation. Get a key at{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                platform.openai.com
              </a>
              .
            </p>

            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="sk-..."
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