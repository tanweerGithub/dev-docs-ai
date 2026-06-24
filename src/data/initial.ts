import type { ChatMessage } from "@/types";

export const WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Welcome to DevDocs AI — your multi-document research assistant.\n\n1. Add doc links or PDFs on the left\n2. Click a document to preview it\n3. Add your Gemini API key and ask anything\n\nCode, comparisons, and diagrams appear in the center tabs when your query needs them.",
    timestamp: new Date(),
  },
];