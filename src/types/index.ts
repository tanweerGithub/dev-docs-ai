export type ResourceType = "pdf" | "docs" | "github";

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  url?: string;
  status: "pending" | "indexing" | "ready" | "error";
  addedAt: Date;
  summary?: string;
  content?: string;
  category?: string;
  detectedLibraries?: string[];
}

export interface ChatAction {
  tab?: CanvasTab;
  codeBlock?: CodeBlock;
  nodes?: LibraryNode[];
  edges?: ArchEdge[];
  comparisons?: DynamicComparison[];
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

export interface ComparisonScorecard {
  easeOfUse: number;
  documentation: number;
  flexibility: number;
  productionReadiness: number;
}

export interface DynamicComparison {
  id: string;
  resourceId: string;
  name: string;
  category: string;
  docsUrl?: string;
  scorecard: ComparisonScorecard;
  codeSnippet: string;
  codeLanguage: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  codeSnippet?: string;
  suggestions?: string[];
}

export type CanvasTab = "reader" | "playground" | "comparison" | "arch";