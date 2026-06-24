export type ResourceType = "url" | "pdf";

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  url?: string;
  pdfBase64?: string;
  previewUrl?: string;
  addedAt: Date;
}

export interface DocCitation {
  id: string;
  resourceName: string;
  excerpt: string;
  url?: string;
}

export interface CodeBlock {
  language: string;
  code: string;
}

export interface ComparisonItem {
  name: string;
  scores: {
    easeOfUse: number;
    documentation: number;
    flexibility: number;
  };
  codeSnippet: string;
  codeLanguage: string;
}

export interface ComparisonResult {
  title: string;
  task: string;
  items: ComparisonItem[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: string[];
}

export type CanvasTab = "document" | "playground" | "comparison" | "diagram";

export interface ResearchResponse {
  answer: string;
  citations: string[];
  code: CodeBlock | null;
  comparison: ComparisonResult | null;
  diagram: string | null;
  suggestedTab: CanvasTab | null;
}