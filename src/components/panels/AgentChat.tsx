"use client";

import { useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { useApp } from "@/context/AppContext";

const STARTERS = [
  "Summarize the key findings across my documents",
  "Compare approaches for building an AI agent",
  "Show me code to get started",
  "Draw an architecture diagram of the system",
];

export function AgentChat() {
  const { messages, addMessage, isLoading, apiKey } = useApp();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    await addMessage(text);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-500/20 p-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Research Assistant
            </h2>
            <p className="text-xs text-zinc-500">
              {apiKey ? "Gemini · multi-document Q&A" : "Add Gemini key first"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant"
                  ? "bg-violet-500/20 text-violet-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-3.5 w-3.5" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-zinc-900 text-zinc-300"
                  : "bg-blue-600/20 text-zinc-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-zinc-800 pt-2">
                  <p className="text-[10px] font-medium text-zinc-500">
                    References
                  </p>
                  {msg.citations.map((c) => (
                    <p key={c} className="text-[10px] text-emerald-400/80">
                      {c}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
            </div>
            <div className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-500">
              Researching your documents...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 border-t border-zinc-800 px-3 py-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={isLoading}
              className="rounded-full border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            disabled={isLoading}
            placeholder={
              apiKey ? "Ask about your documents..." : "Add Gemini API key first"
            }
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-violet-600 px-3 py-2.5 text-white hover:bg-violet-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}