"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  FileText,
  Globe,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { ChatMessageContent } from "@/components/shared/ChatMessageContent";
import { normalizeMessageCitations } from "@/lib/citations";
import { useApp } from "@/context/AppContext";
import type { ChatCitation, Resource } from "@/types";

const STARTERS = [
  "How do I create a multimodal prompt with images?",
  "How do I build a simple agent with tools?",
  "Compare LangChain vs Google ADK for building an agent",
];

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function resourceIcon(r: Resource) {
  return r.type === "url" ? Globe : FileText;
}

function CitationLinks({
  citations,
  onOpenDocument,
}: {
  citations: ChatCitation[];
  onOpenDocument: (resourceId: string) => void;
}) {
  return (
    <div className="mt-2 space-y-1.5 border-t border-zinc-800 pt-2">
      <p className="text-xs font-medium text-zinc-500">References</p>
      {citations.map((c, i) => {
        const text = (
          <>
            <span className="font-medium">{c.label}</span>
            {c.page && (
              <span className="text-zinc-500"> · p.{c.page}</span>
            )}
            {c.excerpt && (
              <span className="text-zinc-500"> — {c.excerpt}</span>
            )}
            {c.source === "web" && (
              <span className="ml-1 text-zinc-600">(web)</span>
            )}
          </>
        );

        if (c.resourceId) {
          return (
            <button
              key={`${c.label}-${i}`}
              type="button"
              onClick={() => onOpenDocument(c.resourceId!)}
              className="block w-full cursor-pointer text-left text-xs text-emerald-400/90 hover:text-emerald-300 hover:underline"
            >
              {text}
            </button>
          );
        }

        if (c.url) {
          return (
            <a
              key={`${c.label}-${i}`}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-emerald-400/90 hover:text-emerald-300 hover:underline"
            >
              {text}
            </a>
          );
        }

        return (
          <p key={`${c.label}-${i}`} className="text-xs text-emerald-400/80">
            {text}
          </p>
        );
      })}
    </div>
  );
}

export function AgentChat() {
  const {
    messages,
    addMessage,
    isLoading,
    apiKey,
    resources,
    selectResource,
    webSearchEnabled,
    setWebSearchEnabled,
  } = useApp();
  const [input, setInput] = useState("");
  const [scopedIds, setScopedIds] = useState<string[] | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const showStarters = useMemo(
    () => !messages.some((m) => m.role === "user"),
    [messages]
  );

  const scopedResources = useMemo(
    () =>
      scopedIds
        ? resources.filter((r) => scopedIds.includes(r.id))
        : [],
    [scopedIds, resources]
  );

  const mentionCandidates = useMemo(() => {
    if (!mentionOpen) return [];
    const q = mentionFilter.toLowerCase();
    return resources.filter((r) => r.name.toLowerCase().includes(q));
  }, [mentionOpen, mentionFilter, resources]);

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
  }, []);

  useEffect(() => {
    if (mentionIndex >= mentionCandidates.length) {
      setMentionIndex(Math.max(0, mentionCandidates.length - 1));
    }
  }, [mentionCandidates.length, mentionIndex]);

  const updateMentionState = useCallback(
    (value: string) => {
      const match = value.match(/@([^\s@]*)$/);
      if (match && resources.length > 0) {
        setMentionOpen(true);
        setMentionFilter(match[1]);
        setMentionIndex(0);
      } else {
        setMentionOpen(false);
        setMentionFilter("");
      }
    },
    [resources.length]
  );

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);
    updateMentionState(value);
    requestAnimationFrame(resizeInput);
  };

  const selectMention = useCallback(
    (resource: Resource) => {
      setScopedIds([resource.id]);
      setInput((prev) => prev.replace(/@([^\s@]*)$/, "").trimStart());
      setMentionOpen(false);
      setMentionFilter("");
      setMentionIndex(0);
      inputRef.current?.focus();
    },
    []
  );

  const clearScope = () => {
    setScopedIds(null);
    inputRef.current?.focus();
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    setMentionOpen(false);
    const ids = scopedIds ?? undefined;
    setScopedIds(null);
    await addMessage(trimmed, ids);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || isLoading) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      setInput(transcript);
      updateMentionState(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [isLoading, updateMentionState]);

  const toggleMic = () => {
    if (listening) stopListening();
    else startListening();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  useEffect(() => {
    resizeInput();
  }, [input, resizeInput]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  return (
    <aside className="flex h-full w-[26rem] min-w-0 shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">
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
              {apiKey
                ? webSearchEnabled
                  ? "Gemini · docs + web search"
                  : "Gemini · your documents only"
                : "Add Gemini key first"}
            </p>
          </div>
        </div>
      </div>

      {resources.length > 0 && (
        <p className="border-b border-zinc-800/50 px-4 py-2 text-xs text-zinc-500">
          Type <span className="text-violet-400">@</span> in the chat box to
          query a specific source · otherwise all sources are used
        </p>
      )}

      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex min-w-0 gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
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
              className={`min-w-0 max-w-[92%] overflow-hidden rounded-xl px-3.5 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-zinc-900 text-zinc-300"
                  : "bg-blue-600/20 text-zinc-200"
              }`}
            >
              {msg.scopedLabel && msg.role === "user" && (
                <p className="mb-1.5 text-xs font-medium text-violet-300">
                  @{msg.scopedLabel}
                </p>
              )}
              <div className="max-w-full overflow-x-auto">
                {msg.role === "assistant" ? (
                  <ChatMessageContent
                    content={msg.content}
                    resources={resources}
                    citations={normalizeMessageCitations(
                      msg.citations,
                      resources
                    )}
                    onOpenDocument={selectResource}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {msg.content}
                  </p>
                )}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <CitationLinks
                  citations={normalizeMessageCitations(
                    msg.citations,
                    resources
                  )}
                  onOpenDocument={selectResource}
                />
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

      {showStarters && (
        <div className="space-y-2 border-t border-zinc-800 px-3 py-3">
          <p className="text-xs font-medium text-zinc-500">Try asking</p>
          <div className="flex flex-col gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={isLoading}
                className="rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-2.5 text-left text-sm leading-snug text-zinc-300 transition-colors hover:border-violet-500/40 hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative border-t border-zinc-800 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-300">Web search</p>
            <p className="text-[10px] leading-snug text-zinc-500">
              {webSearchEnabled
                ? "May cite pages outside your sources"
                : "Answers only from your sources"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={webSearchEnabled}
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              webSearchEnabled ? "bg-violet-600" : "bg-zinc-700"
            }`}
            title={
              webSearchEnabled
                ? "Turn off web search"
                : "Turn on web search"
            }
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                webSearchEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {listening && (
          <p className="mb-2 flex items-center gap-1.5 text-[10px] text-violet-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            Listening… speak your question
          </p>
        )}

        {scopedResources.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {scopedResources.map((r) => {
              const Icon = resourceIcon(r);
              return (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300 ring-1 ring-violet-500/25"
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="max-w-[140px] truncate">{r.name}</span>
                  <button
                    type="button"
                    onClick={clearScope}
                    className="rounded p-0.5 hover:bg-violet-500/20"
                    aria-label="Clear document scope"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {mentionOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 max-h-40 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
            {mentionCandidates.length === 0 ? (
              <p className="px-3 py-2 text-[10px] text-zinc-500">
                No matching sources
              </p>
            ) : (
              mentionCandidates.map((r, index) => {
                const Icon = resourceIcon(r);
                const active = index === mentionIndex;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectMention(r)}
                    onMouseEnter={() => setMentionIndex(index)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                      active
                        ? "bg-violet-500/20 text-violet-200"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span className="min-w-0 truncate">{r.name}</span>
                  </button>
                );
              })
            )}
            <p className="border-t border-zinc-800 px-3 py-1.5 text-[9px] text-zinc-600">
              ↑↓ navigate · Enter select · Esc close
            </p>
          </div>
        )}

        <div className="relative rounded-2xl border border-zinc-700 bg-zinc-900 shadow-sm focus-within:border-violet-500/70 focus-within:ring-1 focus-within:ring-violet-500/30">
          <textarea
            ref={inputRef}
            value={input}
            rows={3}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              apiKey
                ? resources.length > 0
                  ? "Ask anything, or type @ to pick a source…"
                  : speechSupported
                    ? "Ask or tap the mic…"
                    : "Ask about your documents..."
                : "Add Gemini API key first"
            }
            className="min-h-[5rem] max-h-[12.5rem] w-full resize-none rounded-2xl border-0 bg-transparent px-4 py-3 pr-24 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
          />
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={isLoading}
                title={listening ? "Stop listening" : "Voice input"}
                className={`rounded-full p-2 transition-colors disabled:opacity-40 ${
                  listening
                    ? "bg-violet-500/20 text-violet-400"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                {listening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className="rounded-full bg-violet-600 p-2 text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}