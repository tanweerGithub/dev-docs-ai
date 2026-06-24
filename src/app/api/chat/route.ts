import { NextResponse } from "next/server";
import { handleChatMessage } from "@/lib/chat";
import {
  askGemini,
  buildCodeBlockFromGemini,
  generateComparison,
} from "@/lib/gemini";
import type { ChatAction, CodeBlock, Resource } from "@/types";

function mergeActions(
  ruleAction?: ChatAction,
  geminiCode?: CodeBlock,
  comparisons?: ChatAction["comparisons"]
): ChatAction | undefined {
  if (!ruleAction && !geminiCode && !comparisons?.length) return undefined;

  return {
    tab: comparisons?.length
      ? "comparison"
      : geminiCode
        ? "playground"
        : ruleAction?.tab,
    codeBlock: geminiCode ?? ruleAction?.codeBlock,
    nodes: ruleAction?.nodes,
    edges: ruleAction?.edges,
    comparisons,
  };
}

function isCompareIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /compare|versus|vs\.|side.by.side|which is better|difference between/.test(
    lower
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message: string;
      resources: Resource[];
      currentCode?: CodeBlock;
      apiKey?: string;
      focusResourceId?: string;
    };

    const {
      message,
      resources,
      currentCode,
      apiKey: clientKey,
      focusResourceId,
    } = body;

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
    let comparisonMeta: { category: string; task: string } | undefined;

    if (apiKey) {
      try {
        if (isCompareIntent(message)) {
          const cmp = await generateComparison(apiKey, resources ?? [], message);
          finalMessage = `Comparison for "${cmp.task}" across ${cmp.items.length} resources. See the Comparison tab for scorecards and side-by-side code. Ask me for your specific use case for a tailored recommendation.`;
          aiPowered = true;
          action = mergeActions(undefined, undefined, cmp.items);
          comparisonMeta = { category: cmp.category, task: cmp.task };
          suggestions = [
            "Which fits a production voice agent?",
            "Show me LangChain code in the playground",
          ];
        } else {
          const gemini = await askGemini(
            apiKey,
            message,
            resources ?? [],
            currentCode,
            focusResourceId
          );

          finalMessage = gemini.message;
          aiPowered = true;
          suggestions = gemini.suggestions ?? suggestions;

          const geminiCode = buildCodeBlockFromGemini(gemini, resources ?? []);
          action = mergeActions(ruleResponse.action, geminiCode);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Gemini failed";
        if (ruleResponse.action) {
          finalMessage = `${ruleResponse.message}\n\n(AI response unavailable: ${errMsg})`;
        } else {
          return NextResponse.json({ error: errMsg }, { status: 502 });
        }
      }
    } else if (!ruleResponse.action) {
      finalMessage = `${ruleResponse.message}\n\nAdd your Gemini API key (top-right) to get AI answers grounded in your indexed docs.`;
    }

    return NextResponse.json({
      message: finalMessage,
      suggestions,
      codeSnippet: aiPowered
        ? "Powered by Gemini · grounded in your indexed docs"
        : ruleResponse.codeSnippet,
      action,
      comparisonMeta,
      aiPowered,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}