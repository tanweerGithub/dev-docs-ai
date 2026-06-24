import { detectLibrariesFromText } from "@/lib/libraries";

export interface IngestResult {
  name: string;
  summary: string;
  detectedLibraries: string[];
}

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function ingestGithub(url: string): Promise<IngestResult> {
  const parsed = parseGithubRepo(url);
  if (!parsed) throw new Error("Invalid GitHub URL");

  const { owner, repo } = parsed;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const res = await fetch(apiUrl, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    full_name: string;
    description: string | null;
    topics?: string[];
  };

  const text = [data.full_name, data.description ?? "", ...(data.topics ?? [])].join(
    " "
  );

  return {
    name: data.full_name,
    summary: data.description ?? `GitHub repository ${data.full_name}`,
    detectedLibraries: detectLibrariesFromText(text),
  };
}

export async function ingestDocs(url: string): Promise<IngestResult> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Could not fetch docs: ${res.status}`);

  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim().replace(/\s+/g, " ") ?? new URL(url).hostname;

  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  const summary = textOnly.slice(0, 2000) || `Documentation from ${title}`;

  return {
    name: title,
    summary,
    detectedLibraries: detectLibrariesFromText(`${title} ${url} ${summary}`),
  };
}

export function ingestPdf(filename: string): IngestResult {
  return {
    name: filename,
    summary: "PDF uploaded — text extraction will run in a future release.",
    detectedLibraries: [],
  };
}