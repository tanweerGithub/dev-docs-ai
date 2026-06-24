"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_CODE,
  INITIAL_EDGES,
  INITIAL_MESSAGES,
  INITIAL_NODES,
  SAMPLE_COMPARISONS,
} from "@/data/sample-data";
import { getStoredApiKey } from "@/lib/api-key-storage";
import { detectLibrariesFromResources } from "@/lib/libraries";
import type {
  ArchEdge,
  CanvasTab,
  ChatMessage,
  CodeBlock,
  LibraryComparison,
  LibraryNode,
  Resource,
} from "@/types";

interface AppContextValue {
  resources: Resource[];
  addResource: (resource: Omit<Resource, "id" | "addedAt" | "status">) => void;
  removeResource: (id: string) => void;
  activeTab: CanvasTab;
  setActiveTab: (tab: CanvasTab) => void;
  codeBlock: CodeBlock;
  highlightedCitation: string | null;
  setHighlightedCitation: (id: string | null) => void;
  comparisons: LibraryComparison[];
  messages: ChatMessage[];
  addMessage: (content: string) => Promise<void>;
  isChatLoading: boolean;
  nodes: LibraryNode[];
  edges: ArchEdge[];
  readyCount: number;
  hasSynthesized: boolean;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTab, setActiveTab] = useState<CanvasTab>("playground");
  const [codeBlock, setCodeBlock] = useState<CodeBlock>(EMPTY_CODE);
  const [highlightedCitation, setHighlightedCitation] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [nodes, setNodes] = useState<LibraryNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<ArchEdge[]>(INITIAL_EDGES);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const nudgeSentRef = useRef(false);
  const prevReadyCountRef = useRef(0);

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) setApiKey(stored);
  }, []);

  const readyCount = resources.filter((r) => r.status === "ready").length;
  const hasSynthesized = codeBlock.id !== EMPTY_CODE.id;

  useEffect(() => {
    if (
      readyCount > 0 &&
      prevReadyCountRef.current === 0 &&
      !nudgeSentRef.current
    ) {
      nudgeSentRef.current = true;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-nudge-${Date.now()}`,
          role: "assistant",
          content: `Great — ${readyCount} resource${readyCount === 1 ? "" : "s"} indexed. Click "Synthesize integration" in the center banner, or use the suggestion below. Add your OpenAI API key (top-right) for AI-powered answers about your docs.`,
          timestamp: new Date(),
          suggestions: [
            "Synthesize an integration with caching and background tasks",
            "What libraries did you detect from my docs?",
          ],
        },
      ]);
    }
    prevReadyCountRef.current = readyCount;
  }, [readyCount]);

  const addResource = useCallback(
    (resource: Omit<Resource, "id" | "addedAt" | "status">) => {
      const id = `res-${Date.now()}`;
      const newResource: Resource = {
        ...resource,
        id,
        status: "indexing",
        addedAt: new Date(),
      };

      setResources((prev) => [newResource, ...prev]);

      (async () => {
        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: resource.type,
              url: resource.url,
              name: resource.name,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setResources((prev) =>
              prev.map((r) =>
                r.id === id ? { ...r, status: "error" as const } : r
              )
            );
            return;
          }

          setResources((prev) =>
            prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: "ready" as const,
                    name: data.name ?? r.name,
                    summary: data.summary,
                    detectedLibraries: data.detectedLibraries,
                  }
                : r
            )
          );
        } catch {
          setResources((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, status: "error" as const } : r
            )
          );
        }
      })();
    },
    []
  );

  const removeResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsChatLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            resources,
            currentCode: codeBlock,
            apiKey,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Chat request failed");
        }

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-reply`,
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          codeSnippet: data.aiPowered
            ? "Powered by OpenAI · grounded in your indexed docs"
            : data.codeSnippet,
          suggestions: data.suggestions,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (data.action) {
          if (data.action.tab) setActiveTab(data.action.tab);
          if (data.action.codeBlock) setCodeBlock(data.action.codeBlock);
          if (data.action.nodes) setNodes(data.action.nodes);
          if (data.action.edges) setEdges(data.action.edges);
        }
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-err`,
            role: "assistant",
            content: errMsg,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [resources, codeBlock, apiKey]
  );

  const comparisons = useMemo(() => {
    const libs = detectLibrariesFromResources(resources);
    return libs.includes("celery") ? SAMPLE_COMPARISONS : [];
  }, [resources]);

  const value = useMemo(
    () => ({
      resources,
      addResource,
      removeResource,
      activeTab,
      setActiveTab,
      codeBlock,
      highlightedCitation,
      setHighlightedCitation,
      comparisons,
      messages,
      addMessage,
      isChatLoading,
      nodes,
      edges,
      readyCount,
      hasSynthesized,
      apiKey,
      setApiKey,
    }),
    [
      resources,
      addResource,
      removeResource,
      activeTab,
      codeBlock,
      highlightedCitation,
      comparisons,
      messages,
      addMessage,
      isChatLoading,
      nodes,
      edges,
      readyCount,
      hasSynthesized,
      apiKey,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}