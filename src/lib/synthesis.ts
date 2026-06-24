import type {
  ArchEdge,
  CodeBlock,
  DocCitation,
  LibraryNode,
  Resource,
} from "@/types";
import {
  detectLibrariesFromResources,
  libraryLabel,
  type LibraryId,
} from "@/lib/libraries";

const NODE_META: Record<
  LibraryId,
  { category: LibraryNode["category"]; description: string }
> = {
  fastapi: { category: "api", description: "Async REST API framework" },
  redis: { category: "cache", description: "In-memory cache & message broker" },
  celery: { category: "queue", description: "Distributed background tasks" },
  postgres: {
    category: "database",
    description: "Primary relational datastore",
  },
};

function findResourceForLibrary(
  resources: Resource[],
  lib: LibraryId
): Resource | undefined {
  const signals: Record<LibraryId, string[]> = {
    fastapi: ["fastapi"],
    redis: ["redis"],
    celery: ["celery"],
    postgres: ["postgres", "postgresql"],
  };

  return resources.find((r) => {
    const blob = `${r.name} ${r.url ?? ""} ${r.summary ?? ""}`.toLowerCase();
    return signals[lib].some((s) => blob.includes(s));
  });
}

function buildCitations(
  resources: Resource[],
  libs: LibraryId[]
): DocCitation[] {
  const citations: DocCitation[] = [];

  const snippets: Partial<
    Record<LibraryId, { lines: [number, number]; excerpt: string }>
  > = {
    fastapi: {
      lines: [12, 18],
      excerpt:
        "Define path operations with @app.post — returns are serialized as JSON.",
    },
    redis: {
      lines: [45, 52],
      excerpt:
        "setex(key, seconds, value) stores a value with a TTL for cache invalidation.",
    },
    celery: {
      lines: [88, 95],
      excerpt:
        "task.delay(*args) enqueues work to a worker without blocking the API.",
    },
    postgres: {
      lines: [30, 38],
      excerpt: "Use an ORM session to persist and query relational records.",
    },
  };

  libs.forEach((lib, i) => {
    const resource = findResourceForLibrary(resources, lib);
    if (!resource) return;
    const snippet = snippets[lib];
    if (!snippet) return;

    citations.push({
      id: `cite-${lib}`,
      resourceId: resource.id,
      resourceName: resource.name,
      lineStart: snippet.lines[0],
      lineEnd: snippet.lines[1],
      excerpt: snippet.excerpt,
      url: resource.url,
    });
  });

  return citations;
}

function buildArch(libs: LibraryId[]): {
  nodes: LibraryNode[];
  edges: ArchEdge[];
} {
  const nodes: LibraryNode[] = libs.map((lib) => ({
    id: lib,
    label: libraryLabel(lib),
    category: NODE_META[lib].category,
    description: NODE_META[lib].description,
  }));

  const edges: ArchEdge[] = [];
  const has = (lib: LibraryId) => libs.includes(lib);

  if (has("fastapi") && has("redis")) {
    edges.push({
      id: "e-fa-redis",
      source: "fastapi",
      target: "redis",
      label: "cache reads/writes",
    });
  }
  if (has("fastapi") && has("celery")) {
    edges.push({
      id: "e-fa-celery",
      source: "fastapi",
      target: "celery",
      label: "enqueue tasks",
    });
  }
  if (has("celery") && has("redis")) {
    edges.push({
      id: "e-celery-redis",
      source: "celery",
      target: "redis",
      label: "broker & results",
    });
  }
  if (has("fastapi") && has("postgres")) {
    edges.push({
      id: "e-fa-pg",
      source: "fastapi",
      target: "postgres",
      label: "ORM queries",
    });
  }
  if (has("celery") && has("postgres")) {
    edges.push({
      id: "e-celery-pg",
      source: "celery",
      target: "postgres",
      label: "persist results",
    });
  }

  return { nodes, edges };
}

function buildCode(libs: LibraryId[]): string {
  const has = (lib: LibraryId) => libs.includes(lib);

  if (has("fastapi") && has("redis") && has("celery")) {
    return `from fastapi import FastAPI
from celery import Celery
import redis.asyncio as redis

app = FastAPI()
celery_app = Celery("tasks", broker="redis://localhost:6379/0")
cache = redis.from_url("redis://localhost:6379/1")

@celery_app.task
def process_report(user_id: int):
    return {"user_id": user_id, "status": "complete"}

@app.post("/reports/{user_id}")
async def create_report(user_id: int):
    cached = await cache.get(f"report:{user_id}")
    if cached:
        return {"source": "cache", "data": cached.decode()}

    task = process_report.delay(user_id)
    await cache.setex(f"report:{user_id}", 3600, "pending")
    return {"source": "queued", "task_id": task.id}`;
  }

  if (has("fastapi") && has("redis")) {
    return `from fastapi import FastAPI
import redis.asyncio as redis

app = FastAPI()
cache = redis.from_url("redis://localhost:6379/0")

@app.get("/items/{item_id}")
async def get_item(item_id: str):
    cached = await cache.get(f"item:{item_id}")
    if cached:
        return {"source": "cache", "data": cached.decode()}

    data = {"item_id": item_id, "name": "Example"}
    await cache.setex(f"item:{item_id}", 300, data["name"])
    return {"source": "origin", "data": data}`;
  }

  if (has("fastapi")) {
    return `from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}`;
  }

  if (has("redis")) {
    return `import redis.asyncio as redis

cache = redis.from_url("redis://localhost:6379/0")

async def remember(key: str, value: str, ttl: int = 300):
    await cache.setex(key, ttl, value)`;
  }

  return `# Add GitHub repos or doc links, then ask the agent to synthesize.
# Detected libraries: ${libs.map(libraryLabel).join(", ") || "none"}`;
}

export interface SynthesisResult {
  codeBlock: CodeBlock;
  nodes: LibraryNode[];
  edges: ArchEdge[];
  libraries: LibraryId[];
}

export function synthesizeFromResources(
  resources: Resource[]
): SynthesisResult | null {
  const ready = resources.filter((r) => r.status === "ready");
  if (ready.length === 0) return null;

  const libraries = detectLibrariesFromResources(ready);
  if (libraries.length === 0) return null;

  const { nodes, edges } = buildArch(libraries);
  const citations = buildCitations(ready, libraries);

  return {
    libraries,
    nodes,
    edges,
    codeBlock: {
      id: `code-${Date.now()}`,
      language: "python",
      code: buildCode(libraries),
      citations,
    },
  };
}