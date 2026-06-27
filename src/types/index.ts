export type ResourceType = "url" | "file";

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  url?: string;
  mimeType?: string;
  fileBase64?: string;
  previewUrl?: string;
  addedAt: Date;
}

export interface DocCitation {
  id: string;
  resourceName: string;
  excerpt: string;
  url?: string;
}

export interface ChatCitation {
  label: string;
  excerpt?: string;
  url?: string;
  resourceId?: string;
  page?: number;
  source: "document" | "web";
}

export interface CodeBlock {
  language: string;
  code: string;
}

export interface ComparisonItem {
  name: string;
  scores?: {
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
  citations?: ChatCitation[] | string[];
  scopedLabel?: string;
}

export type CanvasTab = "document" | "playground" | "comparison" | "diagram";

export interface ArtifactMeta {
  query: string;
  sourceIds: string[];
  sourceLabel: string;
}

export interface ResearchResponse {
  answer: string;
  citations: ChatCitation[];
  code: CodeBlock | null;
  comparison: ComparisonResult | null;
  diagram: string | null;
  suggestedTab: CanvasTab | null;
}