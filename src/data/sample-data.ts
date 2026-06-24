import type {
  ArchEdge,
  ChatMessage,
  CodeBlock,
  LibraryComparison,
  LibraryNode,
} from "@/types";

export const EMPTY_CODE: CodeBlock = {
  id: "code-empty",
  language: "python",
  code: `# DevDocs AI — Interactive Playground
#
# 1. Add a doc link on the left (e.g. LangChain, Redis, LangGraph docs)
# 2. Add your Gemini API key (top-right)
# 3. Ask in chat: "Help me build a chat template for audio and image files"
#
# Generated code and doc citations will appear here.`,
  citations: [],
};

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-welcome",
    role: "assistant",
    content:
      "Welcome to DevDocs AI.\n\n1. Paste a doc link on the left (official docs, GitHub readme, etc.)\n2. Add your Gemini API key (top-right)\n3. Ask me anything — e.g. \"help me set up a Redis client\" or \"build a LangChain template for audio\"\n\nI'll answer from your docs, cite sources, and put code in the Playground.",
    timestamp: new Date(),
    suggestions: [
      "Help me set up a Redis Python client",
      "Generate code from my indexed documentation",
    ],
  },
];

export const INITIAL_NODES: LibraryNode[] = [];

export const INITIAL_EDGES: ArchEdge[] = [];

export const SAMPLE_COMPARISONS: LibraryComparison[] = [
  {
    id: "cmp-1",
    name: "Celery",
    version: "5.4",
    license: "BSD-3",
    speed: 72,
    easeOfIntegration: 65,
    pros: ["Battle-tested", "Rich ecosystem", "Flexible brokers"],
    cons: ["Complex setup", "Heavy for small apps"],
    docsUrl: "https://docs.celeryq.dev",
  },
  {
    id: "cmp-2",
    name: "RQ (Redis Queue)",
    version: "2.1",
    license: "BSD-2",
    speed: 85,
    easeOfIntegration: 92,
    pros: ["Minimal API", "Redis-only", "Quick to ship"],
    cons: ["Fewer features", "Python-only workers"],
    docsUrl: "https://python-rq.org",
  },
  {
    id: "cmp-3",
    name: "Dramatiq",
    version: "1.17",
    license: "LGPL-3",
    speed: 88,
    easeOfIntegration: 78,
    pros: ["Simple mental model", "Good defaults", "Prometheus hooks"],
    cons: ["Smaller community", "Fewer broker options"],
    docsUrl: "https://dramatiq.io",
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  api: "#3b82f6",
  database: "#8b5cf6",
  queue: "#f59e0b",
  auth: "#ef4444",
  cache: "#10b981",
  other: "#6b7280",
};