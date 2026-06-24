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
# End-to-end flow:
# 1. Add resources on the left (GitHub repo, doc links)
# 2. Wait for "ready" status after indexing
# 3. Ask the agent: "Synthesize an integration with caching and background tasks"
#
# Synthesized code and doc citations will appear here.`,
  citations: [],
};

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-welcome",
    role: "assistant",
    content:
      "Welcome to DevDocs AI.\n\n1. Add docs/repos on the left (try the quick-add demo stack)\n2. Add your OpenAI API key (top-right) for AI chat\n3. Ask me to synthesize — code, diagrams, and comparisons will appear in the center canvas",
    timestamp: new Date(),
    suggestions: [
      "Synthesize an integration with caching and background tasks",
      "What libraries did you detect from my docs?",
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