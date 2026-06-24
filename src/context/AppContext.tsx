"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WELCOME_MESSAGES } from "@/data/initial";
import { getStoredApiKey } from "@/lib/api-key-storage";
import type {
  CanvasTab,
  ChatMessage,
  CodeBlock,
  ComparisonResult,
  Resource,
} from "@/types";

interface AppContextValue {
  resources: Resource[];
  addUrl: (url: string) => void;
  addPdf: (file: File) => void;
  removeResource: (id: string) => void;
  selectedId: string | null;
  selectResource: (id: string) => void;
  activeTab: CanvasTab;
  setActiveTab: (tab: CanvasTab) => void;
  messages: ChatMessage[];
  addMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  code: CodeBlock | null;
  comparison: ComparisonResult | null;
  diagram: string | null;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CanvasTab>("document");
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState<CodeBlock | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [diagram, setDiagram] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) setApiKey(stored);
  }, []);

  const selectResource = useCallback((id: string) => {
    setSelectedId(id);
    setActiveTab("document");
  }, []);

  const addUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    let name = trimmed;
    try {
      const u = new URL(trimmed);
      name = u.hostname + u.pathname.slice(0, 50);
    } catch {
      name = trimmed.slice(0, 60);
    }

    if (resources.some((r) => r.url === trimmed)) return;

    const id = `doc-${Date.now()}`;
    const resource: Resource = {
      id,
      type: "url",
      name,
      url: trimmed,
      addedAt: new Date(),
    };

    setResources((prev) => [resource, ...prev]);
    setSelectedId(id);
    setActiveTab("document");
  }, [resources]);

  const addPdf = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const previewUrl = URL.createObjectURL(file);
      const id = `pdf-${Date.now()}`;

      const resource: Resource = {
        id,
        type: "pdf",
        name: file.name,
        pdfBase64: base64,
        previewUrl,
        addedAt: new Date(),
      };

      setResources((prev) => [resource, ...prev]);
      setSelectedId(id);
      setActiveTab("document");
    };
    reader.readAsDataURL(file);
  }, []);

  const removeResource = useCallback((id: string) => {
    setResources((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const addMessage = useCallback(
    async (content: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          content,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            resources: resources.map(({ previewUrl: _, ...r }) => r),
            apiKey,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");

        if (data.code) {
          setCode(data.code);
        }
        if (data.comparison) {
          setComparison(data.comparison);
        }
        if (data.diagram) {
          setDiagram(data.diagram);
        }

        const validTabs: CanvasTab[] = [
          "document",
          "playground",
          "comparison",
          "diagram",
        ];
        if (data.suggestedTab && validTabs.includes(data.suggestedTab)) {
          setActiveTab(data.suggestedTab);
        } else if (data.comparison) {
          setActiveTab("comparison");
        } else if (data.code) {
          setActiveTab("playground");
        } else if (data.diagram) {
          setActiveTab("diagram");
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.answer,
            timestamp: new Date(),
            citations: data.citations,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content:
              err instanceof Error ? err.message : "Something went wrong",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [resources, apiKey]
  );

  const value = useMemo(
    () => ({
      resources,
      addUrl,
      addPdf,
      removeResource,
      selectedId,
      selectResource,
      activeTab,
      setActiveTab,
      messages,
      addMessage,
      isLoading,
      code,
      comparison,
      diagram,
      apiKey,
      setApiKey,
    }),
    [
      resources,
      addUrl,
      addPdf,
      removeResource,
      selectedId,
      selectResource,
      activeTab,
      messages,
      addMessage,
      isLoading,
      code,
      comparison,
      diagram,
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