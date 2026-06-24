import { NextResponse } from "next/server";
import { handleChatMessage } from "@/lib/chat";
import { askGemini, buildCodeBlockFromGemini } from "@/lib/gemini";
import type { ChatAction, CodeBlock, Resource } from "@/types";

function mergeActions(
  ruleAction?: ChatAction,
  geminiCode?: CodeBlock
): ChatAction | undefined {
  if (!ruleAction && !geminiCode) return undefined;

  return {
    tab: geminiCode ? "playground" : ruleAction?.tab,
    codeBlock: geminiCode ?? ruleAction?.codeBlock,
    nodes: ruleAction?.nodes,
    edges: ruleAction?.edges,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message: string;
      resources: Resource[];
      currentCode?: CodeBlock;
      apiKey?: string;
    };

    const { message, resources, currentCode, apiKey: clientKey } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const ruleResponse = handleChatMessage(
      message,
      resources ?? [],
      currentCode
    );

    const apiKey = clientKey?.trim() || process.env.GEMINI_API_KEY;
    let finalMessage = ruleResponse.message;
    let aiPowered = false;
    let suggestions = ruleResponse.suggestions;
    let action = ruleResponse.action;

    if (apiKey) {
      try {
        const gemini = await askGemini(
          apiKey,
          message,
          resources ?? [],
          currentCode
        );

        finalMessage = gemini.message;
        aiPowered = true;
        suggestions = gemini.suggestions ?? suggestions;

        const geminiCode = buildCodeBlockFromGemini(gemini, resources ?? []);
        action = mergeActions(ruleResponse.action, geminiCode);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Gemini failed";
        if (ruleResponse.action) {
          finalMessage = `${ruleResponse.message}\n\n(AI response unavailable: ${errMsg})`;
        } else {
          return NextResponse.json({ error: errMsg }, { status: 502 });
        }
      }
    } else if (!ruleResponse.action) {
      finalMessage = `${ruleResponse.message}\n\nAdd your Gemini API key (top-right) to get AI answers and code grounded in your indexed docs.`;
    }

    return NextResponse.json({
      message: finalMessage,
      suggestions,
      codeSnippet: aiPowered
        ? "Powered by Gemini · grounded in your indexed docs"
        : ruleResponse.codeSnippet,
      action,
      aiPowered,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}