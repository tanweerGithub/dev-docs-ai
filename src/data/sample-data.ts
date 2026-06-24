import type { ArchEdge, ChatMessage, CodeBlock, LibraryNode } from "@/types";

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
      "Welcome to DevDocs AI.\n\n1. Add docs, links, or PDFs on the left — click any to read here\n2. Add your Gemini API key (top-right)\n3. Chat for insights, code, or custom comparisons\n\nWith 2+ docs, a generic comparison overview appears automatically.",
    timestamp: new Date(),
    suggestions: [
      "Help me set up a Redis Python client",
      "Generate code from my indexed documentation",
    ],
  },
];

export const INITIAL_NODES: LibraryNode[] = [];

export const INITIAL_EDGES: ArchEdge[] = [];

export const CATEGORY_COLORS: Record<string, string> = {
  api: "#3b82f6",
  database: "#8b5cf6",
  queue: "#f59e0b",
  auth: "#ef4444",
  cache: "#10b981",
  other: "#6b7280",
};