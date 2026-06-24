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
} from "@/data/sample-data";
import { getStoredApiKey } from "@/lib/api-key-storage";
import type {
  ArchEdge,
  CanvasTab,
  ChatMessage,
  CodeBlock,
  DynamicComparison,
  LibraryNode,
  Resource,
} from "@/types";

function resourceFingerprint(resources: Resource[]): string {
  return resources
    .filter((r) => r.status === "ready")
    .map((r) => r.id)
    .sort()
    .join(",");
}

interface AppContextValue {
  resources: Resource[];
  addResource: (
    resource: Omit<Resource, "id" | "addedAt" | "status">,
    fileData?: string
  ) => void;
  removeResource: (id: string) => void;
  selectedResourceId: string | null;
  selectResource: (id: string) => void;
  activeTab: CanvasTab;
  setActiveTab: (tab: CanvasTab) => void;
  codeBlock: CodeBlock;
  highlightedCitation: string | null;
  setHighlightedCitation: (id: string | null) => void;
  comparisons: DynamicComparison[];
  comparisonMeta: { category: string; task: string } | null;
  isComparisonLoading: boolean;
  refreshComparison: (goal?: string) => Promise<void>;
  messages: ChatMessage[];
  addMessage: (content: string) => Promise<void>;
  isChatLoading: boolean;
  nodes: LibraryNode[];
  edges: ArchEdge[];
  readyCount: number;
  hasSynthesized: boolean;
  needsResynthesis: boolean;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<CanvasTab>("reader");
  const [codeBlock, setCodeBlock] = useState<CodeBlock>(EMPTY_CODE);
  const [highlightedCitation, setHighlightedCitation] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [nodes, setNodes] = useState<LibraryNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<ArchEdge[]>(INITIAL_EDGES);
  const [comparisons, setComparisons] = useState<DynamicComparison[]>([]);
  const [comparisonMeta, setComparisonMeta] = useState<{
    category: string;
    task: string;
  } | null>(null);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [synthesisFingerprint, setSynthesisFingerprint] = useState<
    string | null
  >(null);
  const nudgeSentRef = useRef(false);
  const prevReadyCountRef = useRef(0);
  const comparisonFingerprintRef = useRef<string>("");

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) setApiKey(stored);
  }, []);

  const readyCount = resources.filter((r) => r.status === "ready").length;
  const currentFingerprint = resourceFingerprint(resources);
  const hasSynthesized = codeBlock.id !== EMPTY_CODE.id;
  const needsResynthesis =
    readyCount > 0 &&
    (!hasSynthesized || currentFingerprint !== synthesisFingerprint);

  const refreshComparison = useCallback(
    async (goal?: string) => {
      if (!apiKey || readyCount < 2) return;

      setIsComparisonLoading(true);
      try {
        const res = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resources, apiKey, goal }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Comparison failed");

        setComparisons(data.items ?? []);
        setComparisonMeta({
          category: data.category,
          task: data.task,
        });
        comparisonFingerprintRef.current = currentFingerprint + (goal ?? "");
      } catch {
        /* keep previous comparison on error */
      } finally {
        setIsComparisonLoading(false);
      }
    },
    [apiKey, readyCount, resources, currentFingerprint]
  );

  useEffect(() => {
    if (
      apiKey &&
      readyCount >= 2 &&
      comparisonFingerprintRef.current !== currentFingerprint
    ) {
      refreshComparison();
    }
  }, [apiKey, readyCount, currentFingerprint, refreshComparison]);

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
          content: `Resources indexed. Click any doc on the left to read it here. With 2+ docs and your Gemini key, a comparison overview generates automatically. Ask me anything — answers cite your docs.`,
          timestamp: new Date(),
          suggestions: [
            "Help me set up a Redis Python client",
            "Compare these for building an agent",
          ],
        },
      ]);
    }
    prevReadyCountRef.current = readyCount;
  }, [readyCount]);

  const selectResource = useCallback((id: string) => {
    setSelectedResourceId(id);
    setActiveTab("reader");
  }, []);

  const addResource = useCallback(
    (
      resource: Omit<Resource, "id" | "addedAt" | "status">,
      fileData?: string
    ) => {
      setResources((prev) => {
        if (resource.url && prev.some((r) => r.url === resource.url)) {
          return prev;
        }

        const id = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newResource: Resource = {
          ...resource,
          id,
          status: "indexing",
          addedAt: new Date(),
        };

        setSelectedResourceId(id);
        setActiveTab("reader");

        (async () => {
          try {
            const res = await fetch("/api/ingest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: resource.type,
                url: resource.url,
                name: resource.name,
                fileData,
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              setResources((p) =>
                p.map((r) =>
                  r.id === id ? { ...r, status: "error" as const } : r
                )
              );
              return;
            }

            setResources((p) =>
              p.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      status: "ready" as const,
                      name: data.name ?? r.name,
                      summary: data.summary,
                      content: data.content,
                      category: data.category,
                      detectedLibraries: data.detectedLibraries,
                    }
                  : r
              )
            );
            setSelectedResourceId(id);
          } catch {
            setResources((p) =>
              p.map((r) =>
                r.id === id ? { ...r, status: "error" as const } : r
              )
            );
          }
        })();

        return [newResource, ...prev];
      });
    },
    []
  );

  const removeResource = useCallback((id: string) => {
    setResources((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next;
    });
    setSelectedResourceId((cur) => {
      if (cur !== id) return cur;
      return null;
    });
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
            focusResourceId: selectedResourceId,
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
            ? "Powered by Gemini · grounded in your indexed docs"
            : data.codeSnippet,
          suggestions: data.suggestions,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (data.action) {
          if (data.action.tab) setActiveTab(data.action.tab);
          if (data.action.codeBlock) {
            setCodeBlock(data.action.codeBlock);
            setSynthesisFingerprint(resourceFingerprint(resources));
          }
          if (data.action.nodes) setNodes(data.action.nodes);
          if (data.action.edges) setEdges(data.action.edges);
          if (data.action.comparisons) {
            setComparisons(data.action.comparisons);
            if (data.comparisonMeta) setComparisonMeta(data.comparisonMeta);
          }
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
    [resources, codeBlock, apiKey, selectedResourceId]
  );

  const value = useMemo(
    () => ({
      resources,
      addResource,
      removeResource,
      selectedResourceId,
      selectResource,
      activeTab,
      setActiveTab,
      codeBlock,
      highlightedCitation,
      setHighlightedCitation,
      comparisons,
      comparisonMeta,
      isComparisonLoading,
      refreshComparison,
      messages,
      addMessage,
      isChatLoading,
      nodes,
      edges,
      readyCount,
      hasSynthesized,
      needsResynthesis,
      apiKey,
      setApiKey,
    }),
    [
      resources,
      addResource,
      removeResource,
      selectedResourceId,
      selectResource,
      activeTab,
      codeBlock,
      highlightedCitation,
      comparisons,
      comparisonMeta,
      isComparisonLoading,
      refreshComparison,
      messages,
      addMessage,
      isChatLoading,
      nodes,
      edges,
      readyCount,
      hasSynthesized,
      needsResynthesis,
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