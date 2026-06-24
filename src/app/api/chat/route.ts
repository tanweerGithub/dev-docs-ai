import { NextResponse } from "next/server";
import { handleChatMessage } from "@/lib/chat";
import { chatWithLlm } from "@/lib/llm";
import type { CodeBlock, Resource } from "@/types";

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

    const apiKey = clientKey?.trim() || process.env.OPENAI_API_KEY;
    let finalMessage = ruleResponse.message;
    let aiPowered = false;

    if (apiKey) {
      try {
        finalMessage = await chatWithLlm(
          apiKey,
          message,
          resources ?? [],
          currentCode,
          ruleResponse.action
        );
        aiPowered = true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "LLM failed";
        if (ruleResponse.action) {
          finalMessage = `${ruleResponse.message}\n\n(AI response unavailable: ${errMsg})`;
        } else {
          return NextResponse.json({ error: errMsg }, { status: 502 });
        }
      }
    } else if (!ruleResponse.action) {
      finalMessage = `${ruleResponse.message}\n\nAdd your OpenAI API key (top-right) to get AI answers grounded in your indexed docs.`;
    }

    return NextResponse.json({
      ...ruleResponse,
      message: finalMessage,
      aiPowered,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}