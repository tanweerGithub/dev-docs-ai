import { detectLibrariesFromText } from "@/lib/libraries";

export interface IngestResult {
  name: string;
  summary: string;
  content: string;
  category: string;
  detectedLibraries: string[];
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/langchain|langgraph|crewai|autogen|adk|agent/.test(lower))
    return "agent framework";
  if (/redis|mongodb|postgres|dynamodb|database|sql/.test(lower))
    return "database";
  if (/celery|rq|dramatiq|kafka|queue/.test(lower)) return "task queue";
  if (/fastapi|flask|express|api framework/.test(lower)) return "api framework";
  if (/rest.?assured|testing|junit/.test(lower)) return "testing";
  return "general";
}

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function fetchGithubReadme(
  owner: string,
  repo: string
): Promise<string> {
  const branches = ["main", "master"];
  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (res.ok) return (await res.text()).slice(0, 8000);
  }
  return "";
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

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = (await res.json()) as {
    full_name: string;
    description: string | null;
    topics?: string[];
  };

  const readme = await fetchGithubReadme(owner, repo);
  const text = [
    data.full_name,
    data.description ?? "",
    ...(data.topics ?? []),
    readme,
  ].join(" ");

  const content =
    readme ||
    `${data.description ?? ""}\n\nRepository: ${data.full_name}\nURL: ${url}`;

  return {
    name: data.full_name,
    summary: data.description ?? `GitHub repository ${data.full_name}`,
    content: content.slice(0, 12000),
    category: inferCategory(text),
    detectedLibraries: detectLibrariesFromText(text),
  };
}

export async function ingestDocs(url: string): Promise<IngestResult> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Could not fetch docs: ${res.status}`);

  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title =
    titleMatch?.[1]?.trim().replace(/\s+/g, " ") ?? new URL(url).hostname;

  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const content = textOnly.slice(0, 12000);
  const summary = textOnly.slice(0, 400) || `Documentation from ${title}`;

  return {
    name: title,
    summary,
    content: content || summary,
    category: inferCategory(`${title} ${url} ${textOnly.slice(0, 2000)}`),
    detectedLibraries: detectLibrariesFromText(`${title} ${url} ${summary}`),
  };
}

export async function ingestPdf(
  filename: string,
  base64Data?: string
): Promise<IngestResult> {
  if (!base64Data) {
    return {
      name: filename,
      summary: "PDF uploaded without extractable text.",
      content: "PDF text extraction requires file upload.",
      category: "general",
      detectedLibraries: [],
    };
  }

  const buffer = Buffer.from(base64Data, "base64");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = parsed.text.replace(/\s+/g, " ").trim();

  return {
    name: filename,
    summary: text.slice(0, 400) || `PDF document: ${filename}`,
    content: text.slice(0, 12000) || `PDF document: ${filename}`,
    category: inferCategory(text.slice(0, 3000)),
    detectedLibraries: detectLibrariesFromText(text.slice(0, 3000)),
  };
}