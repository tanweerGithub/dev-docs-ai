import type { Resource } from "@/types";

export type LibraryId = "fastapi" | "redis" | "celery" | "postgres";

const LIBRARY_SIGNALS: Record<LibraryId, string[]> = {
  fastapi: ["fastapi", "tiangolo"],
  redis: ["redis", "redis-py"],
  celery: ["celery", "celeryq"],
  postgres: ["postgres", "postgresql", "psycopg"],
};

export function detectLibrariesFromText(text: string): LibraryId[] {
  const lower = text.toLowerCase();
  return (Object.keys(LIBRARY_SIGNALS) as LibraryId[]).filter((lib) =>
    LIBRARY_SIGNALS[lib].some((signal) => lower.includes(signal))
  );
}

export function detectLibrariesFromResources(
  resources: Resource[]
): LibraryId[] {
  const combined = resources
    .filter((r) => r.status === "ready")
    .map((r) =>
      [r.name, r.url ?? "", r.summary ?? "", ...(r.detectedLibraries ?? [])].join(
        " "
      )
    )
    .join(" ");

  return detectLibrariesFromText(combined);
}

export function libraryLabel(id: LibraryId): string {
  const labels: Record<LibraryId, string> = {
    fastapi: "FastAPI",
    redis: "Redis",
    celery: "Celery",
    postgres: "PostgreSQL",
  };
  return labels[id];
}