"use client";

import { useRef, useState } from "react";
import {
  Bot,
  Bug,
  Code2,
  Lightbulb,
  Loader2,
  Play,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function AgentChat() {
  const { messages, addMessage, setActiveTab, isChatLoading, apiKey } =
    useApp();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isChatLoading) return;
    setInput("");
    await addMessage(trimmed);
    scrollToBottom();
  };

  const sendPrompt = async (text: string) => {
    if (isChatLoading) return;
    await addMessage(text);
    scrollToBottom();
  };

  const quickActions = [
    {
      label: "Simulate run",
      icon: Play,
      action: () => sendPrompt("Simulate running the synthesized code and show any errors."),
    },
    {
      label: "Debug errors",
      icon: Bug,
      action: () => sendPrompt("Explain common integration errors between FastAPI, Redis, and Celery."),
    },
    {
      label: "Improve code",
      icon: Lightbulb,
      action: () => sendPrompt("Propose improvements to the current synthesized code."),
    },
    {
      label: "View playground",
      icon: Code2,
      action: () => setActiveTab("playground"),
    },
  ];

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-500/20 p-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Agentic Debugger
            </h2>
            <p className="text-xs text-zinc-500">
              {apiKey ? "Gemini · grounded in your docs" : "Add Gemini key for AI chat"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 border-b border-zinc-800 p-2">
        {quickActions.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            disabled={isChatLoading}
            className="flex flex-1 flex-col items-center gap-1 rounded-md bg-zinc-900 px-1.5 py-2 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
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
              {msg.codeSnippet && (
                <p className="mt-2 rounded bg-zinc-800 px-2 py-1 font-mono text-[10px] text-emerald-400">
                  {msg.codeSnippet}
                </p>
              )}
              {msg.suggestions && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendPrompt(s)}
                      disabled={isChatLoading}
                      className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
            </div>
            <div className="rounded-xl bg-zinc-900 px-3 py-2.5 text-xs text-zinc-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isChatLoading}
            placeholder="Ask about integrations, errors, or improvements..."
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatLoading}
            className="flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2.5 text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}