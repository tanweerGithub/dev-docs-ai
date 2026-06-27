"use client";

import { useState } from "react";
import { BookMarked, KeyRound, Sparkles, X } from "lucide-react";

interface WelcomeModalProps {
  onSave: (key: string) => void;
  onTryDemo: () => void;
  onDismiss: () => void;
}

export function WelcomeModal({ onSave, onTryDemo, onDismiss }: WelcomeModalProps) {
  const [input, setInput] = useState("");

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setInput("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-labelledby="welcome-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 p-2.5">
              <BookMarked className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2
                id="welcome-title"
                className="text-base font-semibold text-zinc-100"
              >
                Welcome to DevDocs AI
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Research technical docs with grounded answers & code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close welcome dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          Add your free{" "}
          <span className="font-medium text-zinc-300">Gemini API key</span> to
          chat with your documentation, generate code, comparisons, and
          diagrams. Your key stays in your browser only — never sent to our
          servers.
        </p>

        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          <KeyRound className="h-3 w-3" />
          Gemini API key
        </label>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="AIza..."
          autoComplete="off"
          autoFocus
          className="mb-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />
        <p className="mb-5 text-[11px] text-zinc-600">
          Get a free key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            aistudio.google.com
          </a>
          — no credit card required.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            disabled={!input.trim()}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            Save key & start
          </button>
          <button
            type="button"
            onClick={onTryDemo}
            className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-sm font-medium text-violet-300 transition-colors hover:border-violet-500/50 hover:bg-violet-500/15"
          >
            <Sparkles className="h-4 w-4" />
            Try a demo first
          </button>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-400"
        >
          Maybe later — explore the UI
        </button>
      </div>
    </div>
  );
}