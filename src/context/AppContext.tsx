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
import { DEMOS, type DemoId } from "@/data/demos";
import { WELCOME_MESSAGES } from "@/data/initial";
import {
  clearStoredApiKey,
  getStoredApiKey,
  setStoredApiKey,
} from "@/lib/api-key-storage";
import { fallbackResourceName } from "@/lib/page-title";
import type {
  ArtifactMeta,
  CanvasTab,
  ChatMessage,
  CodeBlock,
  ComparisonResult,
  Resource,
} from "@/types";

const ACCEPTED_FILE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/markdown",
  "text/html",
  "text/csv",
]);

function buildArtifactMeta(
  query: string,
  scoped: Resource[]
): ArtifactMeta {
  return {
    query,
    sourceIds: scoped.map((r) => r.id),
    sourceLabel:
      scoped.length === 0
        ? "No sources"
        : scoped.map((r) => r.name).join(" · "),
  };
}

interface AppContextValue {
  resources: Resource[];
  addUrl: (url: string) => Promise<void>;
  addFile: (file: File) => void;
  removeResource: (id: string) => void;
  selectedId: string | null;
  selectResource: (id: string) => void;
  activeTab: CanvasTab;
  setActiveTab: (tab: CanvasTab) => void;
  messages: ChatMessage[];
  addMessage: (content: string, resourceIds?: string[]) => Promise<void>;
  isLoading: boolean;
  code: CodeBlock | null;
  codeMeta: ArtifactMeta | null;
  comparison: ComparisonResult | null;
  comparisonMeta: ArtifactMeta | null;
  diagram: string | null;
  diagramMeta: ArtifactMeta | null;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  loadDemo: (id: DemoId) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CanvasTab>("document");
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState<CodeBlock | null>(null);
  const [codeMeta, setCodeMeta] = useState<ArtifactMeta | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparisonMeta, setComparisonMeta] = useState<ArtifactMeta | null>(
    null
  );
  const [diagram, setDiagram] = useState<string | null>(null);
  const [diagramMeta, setDiagramMeta] = useState<ArtifactMeta | null>(null);
  const [apiKey, setApiKeyState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : getStoredApiKey()
  );

  const setApiKey = useCallback((key: string | null) => {
    const trimmed = key?.trim() ?? "";
    if (trimmed) {
      setStoredApiKey(trimmed);
      setApiKeyState(trimmed);
    } else {
      clearStoredApiKey();
      setApiKeyState(null);
    }
  }, []);

  useEffect(() => {
    const syncFromStorage = () => {
      setApiKeyState(getStoredApiKey());
    };
    syncFromStorage();
    window.addEventListener("focus", syncFromStorage);
    return () => window.removeEventListener("focus", syncFromStorage);
  }, []);

  const selectResource = useCallback((id: string) => {
    setSelectedId(id);
    setActiveTab("document");
  }, []);

  const addUrl = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    const existing = resources.some((r) => r.url === trimmed);
    if (existing) return;

    const id = `doc-${Date.now()}`;
    const resource: Resource = {
      id,
      type: "url",
      name: fallbackResourceName(trimmed),
      url: trimmed,
      addedAt: new Date(),
    };

    setResources((prev) => [resource, ...prev]);
    setSelectedId(id);
    setActiveTab("document");

    try {
      const res = await fetch(
        `/api/page-title?url=${encodeURIComponent(trimmed)}`
      );
      const data = (await res.json()) as { title?: string };
      if (data.title) {
        setResources((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, name: data.title as string } : r
          )
        );
      }
    } catch {
      // keep fallback name
    }
  }, [resources]);

  const addFile = useCallback((file: File) => {
    const mimeType = file.type || "application/octet-stream";
    if (!ACCEPTED_FILE_TYPES.has(mimeType)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const previewUrl = URL.createObjectURL(file);
      const id = `file-${Date.now()}`;

      const resource: Resource = {
        id,
        type: "file",
        name: file.name,
        mimeType,
        fileBase64: base64,
        previewUrl,
        addedAt: new Date(),
      };

      setResources((prev) => [resource, ...prev]);
      setSelectedId(id);
      setActiveTab("document");
    };
    reader.readAsDataURL(file);
  }, []);

  const loadDemo = useCallback((id: DemoId) => {
    const demo = DEMOS[id];
    if (!demo) return;

    const meta = buildArtifactMeta(
      demo.messages.find((m) => m.role === "user")?.content ?? demo.label,
      demo.resources
    );

    setResources(demo.resources);
    setSelectedId(demo.selectedId);
    setActiveTab("document");
    setMessages(demo.messages);
    setDiagram(demo.diagram);
    setDiagramMeta(demo.diagram ? meta : null);

    if (demo.comparison) {
      setComparison(demo.comparison);
      setComparisonMeta(meta);
      setCode(null);
      setCodeMeta(null);
    } else {
      setComparison(null);
      setComparisonMeta(null);
      setCode(demo.code);
      setCodeMeta(demo.code ? meta : null);
    }
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
    async (content: string, resourceIds?: string[]) => {
      const scoped =
        resourceIds && resourceIds.length > 0
          ? resources.filter((r) => resourceIds.includes(r.id))
          : resources;

      const scopedLabel =
        scoped.length > 0 && scoped.length < resources.length
          ? scoped.map((r) => r.name).join(" · ")
          : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          content,
          timestamp: new Date(),
          scopedLabel,
        },
      ]);
      setIsLoading(true);

      try {
        const meta = buildArtifactMeta(content, scoped);
        const scope =
          scoped.length > 0 && scoped.length < resources.length
            ? "active"
            : "all";

        const effectiveApiKey = (apiKey ?? getStoredApiKey())?.trim() || null;
        if (!effectiveApiKey) {
          throw new Error("Add your Gemini API key to start researching");
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            resources: scoped.map(({ previewUrl, ...r }) => r),
            apiKey: effectiveApiKey,
            scope,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");

        if (data.comparison) {
          setComparison(data.comparison);
          setComparisonMeta(meta);
          setCode(null);
          setCodeMeta(null);
        } else if (data.code) {
          setCode(data.code);
          setCodeMeta(meta);
        }
        if (data.diagram) {
          setDiagram(data.diagram);
          setDiagramMeta(meta);
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
      addFile,
      removeResource,
      selectedId,
      selectResource,
      activeTab,
      setActiveTab,
      messages,
      addMessage,
      isLoading,
      code,
      codeMeta,
      comparison,
      comparisonMeta,
      diagram,
      diagramMeta,
      apiKey,
      setApiKey,
      loadDemo,
    }),
    [
      resources,
      addUrl,
      addFile,
      removeResource,
      selectedId,
      selectResource,
      activeTab,
      messages,
      addMessage,
      isLoading,
      code,
      codeMeta,
      comparison,
      comparisonMeta,
      diagram,
      diagramMeta,
      apiKey,
      loadDemo,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}