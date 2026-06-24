import type { ChatApiResponse, CodeBlock, Resource } from "@/types";
import { detectLibrariesFromResources, libraryLabel } from "@/lib/libraries";
import { synthesizeFromResources } from "@/lib/synthesis";

function matchesIntent(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function simulateCode(code: string): string {
  const checks: string[] = [];

  if (code.includes("redis")) {
    checks.push(
      code.includes("redis://")
        ? "✓ Redis connection URL configured"
        : "⚠ Missing redis:// broker URL — workers won't connect"
    );
  }
  if (code.includes("celery") || code.includes("Celery")) {
    checks.push(
      code.includes("broker=")
        ? "✓ Celery broker configured"
        : "⚠ Celery broker not set — tasks won't dispatch"
    );
  }
  if (code.includes("async def") && code.includes("redis")) {
    checks.push("✓ Async handler compatible with redis.asyncio client");
  }
  if (code.includes("@app.")) {
    checks.push("✓ FastAPI route handlers detected");
  }

  if (checks.length === 0) {
    return "No integration patterns detected to simulate. Try synthesizing code first.";
  }

  const passed = checks.filter((c) => c.startsWith("✓")).length;
  return `Simulation complete (${passed}/${checks.length} checks passed):\n${checks.join("\n")}`;
}

export function handleChatMessage(
  message: string,
  resources: Resource[],
  currentCode?: CodeBlock
): ChatApiResponse {
  const ready = resources.filter((r) => r.status === "ready");
  const libs = detectLibrariesFromResources(ready);
  const libNames = libs.map(libraryLabel);

  if (
    matchesIntent(message, [
      "synthesize",
      "integrate",
      "generate",
      "write code",
      "build",
      "cache",
      "background",
      "pipeline",
    ])
  ) {
    if (ready.length === 0) {
      return {
        message:
          "Add at least one GitHub repo or documentation link on the left, wait for indexing to finish, then ask me again.",
        suggestions: [
          "Add https://github.com/fastapi/fastapi",
          "Add Redis docs link",
        ],
      };
    }

    const result = synthesizeFromResources(resources);
    if (!result) {
      return {
        message: `Indexed ${ready.length} resource(s) but couldn't match a known library (FastAPI, Redis, Celery, PostgreSQL). Try adding docs for those libraries.`,
        suggestions: [
          "Add https://github.com/fastapi/fastapi",
          "Add https://docs.celeryq.dev/en/stable/",
        ],
      };
    }

    return {
      message: `Synthesized a ${libNames.join(" + ")} integration from ${ready.length} indexed resource(s). Citations in the Playground reference the exact docs used.`,
      codeSnippet: `${result.codeBlock.citations.length} doc citations linked`,
      suggestions: ["Show architecture diagram", "Compare queue libraries", "Simulate run"],
      action: {
        tab: "playground",
        codeBlock: result.codeBlock,
        nodes: result.nodes,
        edges: result.edges,
      },
    };
  }

  if (matchesIntent(message, ["architect", "diagram", "flow", "connect"])) {
    const result = synthesizeFromResources(resources);
    if (!result) {
      return {
        message: "Synthesize code first so I can derive the architecture diagram from your libraries.",
        suggestions: ["Synthesize an integration with caching and background tasks"],
      };
    }

    return {
      message: `Architecture diagram for ${libNames.join(" → ")}. Arrows show data and task flow between components.`,
      action: {
        tab: "arch",
        nodes: result.nodes,
        edges: result.edges,
      },
      suggestions: ["View synthesized code", "Compare alternatives"],
    };
  }

  if (matchesIntent(message, ["compare", "alternative", "versus", "vs", "which library"])) {
    if (ready.length < 2) {
      return {
        message: "Add at least 2 resources to compare. A generic overview will appear in the Comparison tab.",
        suggestions: ["Help me set up a Redis Python client"],
      };
    }

    return {
      message: "Generating comparison — add your Gemini key if you haven't.",
      action: { tab: "comparison" },
      suggestions: ["Compare MCP setup in ADK vs LangChain"],
    };
  }

  if (matchesIntent(message, ["simulate", "run", "execute", "test"])) {
    const code = currentCode?.code ?? "";
    if (!code || code.startsWith("# Add GitHub")) {
      return {
        message: "Nothing to simulate yet. Synthesize code first, then run simulation.",
        suggestions: ["Synthesize an integration with caching and background tasks"],
      };
    }

    return {
      message: simulateCode(code),
      codeSnippet: "Static analysis — real sandbox execution coming later",
      suggestions: ["Debug connection errors", "Improve code"],
    };
  }

  if (matchesIntent(message, ["debug", "error", "fix", "broken", "fail"])) {
    const hints = [
      "Ensure Redis is running on localhost:6379 before starting workers.",
      "Celery workers need the same broker URL as the FastAPI app.",
      "Use redis.asyncio (not sync redis) inside async FastAPI handlers.",
    ];

    return {
      message: `Common integration issues for ${libNames.join(", ") || "your stack"}:\n• ${hints.join("\n• ")}`,
      suggestions: ["Simulate run", "Improve code"],
    };
  }

  if (matchesIntent(message, ["improve", "better", "optimize", "refactor"])) {
    return {
      message:
        "Suggestions: add retry logic on Celery tasks, use connection pooling for Redis, and set explicit TTLs on cache keys. Full LLM-powered refactors coming in a later release.",
      suggestions: ["Simulate run", "Show architecture diagram"],
    };
  }

  if (ready.length === 0) {
    return {
      message:
        "Welcome to DevDocs AI. Start by adding resources on the left — try the FastAPI GitHub repo and Redis/Celery docs — then ask me to synthesize an integration.",
      suggestions: [
        "Synthesize an integration with caching and background tasks",
        "Add https://github.com/fastapi/fastapi",
      ],
    };
  }

  return {
    message: `You have ${ready.length} indexed resource(s) covering ${libNames.join(", ") || "unknown libraries"}. I can synthesize code, show architecture, compare libraries, or simulate your integration.`,
    suggestions: [
      "Synthesize an integration with caching and background tasks",
      "Show architecture diagram",
      "Compare queue libraries",
    ],
  };
}