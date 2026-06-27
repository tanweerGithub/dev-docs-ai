import type {
  CanvasTab,
  ChatMessage,
  CodeBlock,
  ComparisonResult,
  Resource,
} from "@/types";

export const REDIS_URL =
  "https://redis.io/docs/latest/develop/clients/python/";
export const ADK_URL = "https://google.github.io/adk-docs/agents/";
export const LANGCHAIN_URL =
  "https://docs.langchain.com/oss/python/langchain/quickstart";

export type DemoId = "redis" | "adk" | "langchain" | "compare";

export interface DemoBundle {
  id: DemoId;
  label: string;
  description: string;
  resources: Resource[];
  messages: ChatMessage[];
  code: CodeBlock | null;
  comparison: ComparisonResult | null;
  diagram: string;
  activeTab: CanvasTab;
  selectedId: string;
}

const REDIS_RESOURCE: Resource = {
  id: "demo-redis",
  type: "url",
  name: "Redis — Python client",
  url: REDIS_URL,
  addedAt: new Date(),
};

const ADK_RESOURCE: Resource = {
  id: "demo-adk",
  type: "url",
  name: "Google ADK — Agents",
  url: ADK_URL,
  addedAt: new Date(),
};

const LANGCHAIN_RESOURCE: Resource = {
  id: "demo-langchain",
  type: "url",
  name: "LangChain — Quickstart",
  url: LANGCHAIN_URL,
  addedAt: new Date(),
};

const REDIS_CODE: CodeBlock = {
  language: "python",
  code: `import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

session_id = "agent-session-42"
r.setex(session_id, 3600, '{"last_topic": "redis caching"}')

cached = r.get(session_id)
print(cached)`,
};

const ADK_AGENT_CODE: CodeBlock = {
  language: "python",
  code: `from google.adk import Agent
from google.adk.tools import google_search

root_agent = Agent(
    name="research_assistant",
    model="gemini-2.0-flash",
    instruction=(
        "You are a research assistant. "
        "Use tools when you need up-to-date information."
    ),
    tools=[google_search],
)

response = root_agent.run(
    "What are the latest best practices for building AI agents?"
)
print(response)`,
};

const LANGCHAIN_AGENT_CODE: CodeBlock = {
  language: "python",
  code: `from langchain.agents import create_agent

def get_weather(city: str) -> str:
    """Get weather for a given city."""
    return f"It's always sunny in {city}!"

agent = create_agent(
    model="google_genai:gemini-2.5-flash-lite",
    tools=[get_weather],
    system_prompt="You are a helpful assistant",
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "What is the weather in SF?"}]
})
print(result["messages"][-1].content)`,
};

const COMPARE_RESULT: ComparisonResult = {
  title: "LangChain vs Google ADK",
  task: "Create a simple tool-using agent",
  items: [
    {
      name: "LangChain",
      codeLanguage: "python",
      codeSnippet: `from langchain.agents import create_agent

def search_docs(query: str) -> str:
    """Search indexed documentation."""
    return f"Results for: {query}"

agent = create_agent(
    model="google_genai:gemini-2.5-flash-lite",
    tools=[search_docs],
    system_prompt="Answer using the search_docs tool when needed.",
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "Find Redis caching patterns"}]
})
print(result["messages"][-1].content)`,
    },
    {
      name: "Google ADK",
      codeLanguage: "python",
      codeSnippet: `from google.adk import Agent
from google.adk.tools import google_search

root_agent = Agent(
    name="doc_agent",
    model="gemini-2.0-flash",
    instruction="Answer using tools when needed.",
    tools=[google_search],
)

root_agent.run("Find Redis caching patterns in the docs")`,
    },
  ],
};

export const DEMOS: Record<DemoId, DemoBundle> = {
  redis: {
    id: "redis",
    label: "Redis",
    description: "Python client & caching",
    resources: [REDIS_RESOURCE],
    selectedId: "demo-redis",
    activeTab: "document",
    code: REDIS_CODE,
    comparison: null,
    diagram: `flowchart LR
  A["App"] --> R["Redis client"]
  R --> S[("Redis")]
  S --> C["Cached JSON"]`,
    messages: [
      {
        id: "redis-u1",
        role: "user",
        content: "How do I connect to Redis from Python and cache JSON data?",
        timestamp: new Date(),
      },
      {
        id: "redis-a1",
        role: "assistant",
        content: `The Redis Python client lets you connect with \`redis.Redis(...)\` and store strings or JSON-serialized data.

**From the Redis docs:**
1. Install \`redis\` and connect with host/port
2. Use \`setex\` for TTL-based caching
3. Use \`get\` to read cached values

Starter code is in the Playground. The Document tab previews the official guide.`,
        timestamp: new Date(),
        citations: ["Redis Python client", REDIS_URL],
      },
    ],
  },

  adk: {
    id: "adk",
    label: "Google ADK",
    description: "Build an agent",
    resources: [ADK_RESOURCE],
    selectedId: "demo-adk",
    activeTab: "document",
    code: ADK_AGENT_CODE,
    comparison: null,
    diagram: `flowchart TD
  Q["User query"] --> A["ADK Agent"]
  A --> M["Gemini model"]
  A --> T["Tools"]
  T --> S["google_search"]
  M --> R["Agent response"]`,
    messages: [
      {
        id: "adk-u1",
        role: "user",
        content: "How do I build a simple agent with tools using Google ADK?",
        timestamp: new Date(),
      },
      {
        id: "adk-a1",
        role: "assistant",
        content: `Google ADK lets you define an agent with a model, instruction, and tools. The agent handles the tool-calling loop.

**From the ADK docs:**
1. Create an \`Agent\` with name, model, and instruction
2. Attach tools like \`google_search\`
3. Call \`agent.run(query)\`

Starter code is in the Playground. The Document tab previews the ADK agents guide.`,
        timestamp: new Date(),
        citations: ["Google ADK Agents", ADK_URL],
      },
    ],
  },

  langchain: {
    id: "langchain",
    label: "LangChain",
    description: "Create an agent",
    resources: [LANGCHAIN_RESOURCE],
    selectedId: "demo-langchain",
    activeTab: "document",
    code: LANGCHAIN_AGENT_CODE,
    comparison: null,
    diagram: `flowchart TD
  Q["User message"] --> A["create_agent"]
  A --> M["Gemini model"]
  A --> T["Tools"]
  M --> R["Agent response"]`,
    messages: [
      {
        id: "lc-u1",
        role: "user",
        content: "How do I create a simple agent with tools in LangChain 1.x?",
        timestamp: new Date(),
      },
      {
        id: "lc-a1",
        role: "assistant",
        content: `LangChain 1.x uses \`create_agent\` — one function for model, tools, and system prompt.

**From the quickstart:**
1. Define Python tool functions
2. Call \`create_agent(model=..., tools=[...], system_prompt=...)\`
3. Invoke with \`agent.invoke({"messages": [...]})\`

Starter code is in the Playground. LangChain blocks embedded preview — use Open in browser on the Document tab.`,
        timestamp: new Date(),
        citations: ["LangChain Quickstart", LANGCHAIN_URL],
      },
    ],
  },

  compare: {
    id: "compare",
    label: "Compare agents",
    description: "LangChain vs Google ADK",
    resources: [ADK_RESOURCE, LANGCHAIN_RESOURCE],
    selectedId: "demo-adk",
    activeTab: "document",
    code: null,
    comparison: COMPARE_RESULT,
    diagram: `flowchart TB
  subgraph LC["LangChain 1.x"]
    L1["create_agent"] --> L2["Gemini"]
    L1 --> L3["Python tools"]
  end
  subgraph ADK["Google ADK"]
    A1["Agent"] --> A2["Gemini"]
    A1 --> A3["Built-in tools"]
  end
  U["Same task: tool-using agent"] --> LC
  U --> ADK`,
    messages: [
      {
        id: "cmp-u1",
        role: "user",
        content:
          "Show me how to create a simple tool-using agent in LangChain and Google ADK.",
        timestamp: new Date(),
      },
      {
        id: "cmp-a1",
        role: "assistant",
        content: `Both frameworks solve the **same task** — a tool-using agent — with different APIs.

**LangChain 1.x** uses \`create_agent\` with a model string, Python tools, and a messages-based invoke.

**Google ADK** uses a higher-level \`Agent\` class with built-in tools and \`run()\`.

Side-by-side code for the same task is in the **Comparison** tab (not Playground). ADK previews in Document; open LangChain in your browser if needed.`,
        timestamp: new Date(),
        citations: ["LangChain Quickstart", LANGCHAIN_URL, "Google ADK Agents", ADK_URL],
      },
    ],
  },
};

export const DEMO_LIST: DemoBundle[] = [
  DEMOS.redis,
  DEMOS.adk,
  DEMOS.langchain,
  DEMOS.compare,
];