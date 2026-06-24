export type ResourceType = "pdf" | "docs" | "github";

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  url?: string;
  status: "pending" | "indexing" | "ready" | "error";
  addedAt: Date;
  summary?: string;
  detectedLibraries?: string[];
}

export interface ChatAction {
  tab?: CanvasTab;
  codeBlock?: CodeBlock;
  nodes?: LibraryNode[];
  edges?: ArchEdge[];
}

export interface ChatApiResponse {
  message: string;
  suggestions?: string[];
  codeSnippet?: string;
  action?: ChatAction;
}

export interface LibraryNode extends Record<string, unknown> {
  id: string;
  label: string;
  category: "api" | "database" | "queue" | "auth" | "cache" | "other";
  description: string;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface DocCitation {
  id: string;
  resourceId: string;
  resourceName: string;
  lineStart: number;
  lineEnd: number;
  excerpt: string;
  url?: string;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  citations: DocCitation[];
}

export interface LibraryComparison {
  id: string;
  name: string;
  version: string;
  license: string;
  speed: number;
  easeOfIntegration: number;
  pros: string[];
  cons: string[];
  docsUrl: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  codeSnippet?: string;
  suggestions?: string[];
}

export type CanvasTab = "arch" | "playground" | "comparison";