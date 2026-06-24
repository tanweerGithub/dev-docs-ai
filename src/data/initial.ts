import type { ChatMessage } from "@/types";

export const WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Welcome to DevDocs AI — research assistant for technical documentation.\n\n• Paste documentation links or upload files (left) — add as many as you need\n• Try a demo: Redis, Google ADK, LangChain, or Compare agents (LangChain vs ADK)\n• Open docs in your browser from the Document tab; chat researches from URLs\n• Type @ in chat to query one specific source; otherwise all sources are used\n• Ask \"how do I create an agent in LangChain and Google ADK\" for side-by-side code",
    timestamp: new Date(),
  },
];