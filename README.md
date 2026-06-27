# DevDocs AI

**Multi-document research assistant for technical documentation.**

DevDocs AI helps developers research libraries, APIs, and frameworks from their own documentation sources. Add doc links or upload files, ask questions in natural language, and get grounded answers with citations, runnable code, side-by-side comparisons, and architecture diagrams — without leaving the browser.

**Live demo:** [dev-docs-ai-seven.vercel.app](https://dev-docs-ai-seven.vercel.app)

---

## What it does

DevDocs AI is built for **document-first research**:

1. **Ingest** — Paste documentation URLs or upload PDFs, images, and text files.
2. **Preview** — Open and read sources in the Document tab (iframe when embeddable, or open in browser).
3. **Research** — Chat with Gemini using only your sources by default, or optionally enable web search.
4. **Produce artifacts** — Answers with clickable citations, Playground code, Comparison views, and Mermaid diagrams.

The app does **not** background-index or vector-store your docs. Each question is answered at query time using Gemini (`gemini-2.5-flash`) with your sources attached inline or fetched via URL context.

---

## UI overview

```
┌─────────────┬──────────────────────────────┬─────────────────┐
│   Sources   │   Document · Playground ·    │ Research        │
│             │   Comparison · Diagram       │ Assistant       │
│  Add links  │                              │                 │
│  Upload     │   Center canvas              │  Chat + @scope  │
│  Try demo   │                              │  Web search     │
└─────────────┴──────────────────────────────┴─────────────────┘
```

| Panel | Purpose |
|-------|---------|
| **Sources** (left) | Add doc links, upload files, try demos, clear all |
| **Center tabs** | Document preview, generated code, comparisons, diagrams |
| **Research Assistant** (right) | Gemini chat, citations, scoped queries |

---

## Features

- **Multi-source research** — Stack Redis, LangChain, Google ADK, MongoDB, PDFs, etc.
- **Document-only mode (default)** — Answers grounded in *your* sources; no random web articles.
- **Web search toggle** — Optional Google search when your docs lack the answer.
- **@ mentions** — Type `@` in chat to query a single source.
- **Clickable citations** — Inline `[1]` / `[1 · p.12]` chips link back to sources.
- **Playground** — Monaco editor with generated code and Open in Colab.
- **Comparison** — Side-by-side code (e.g. LangChain vs Google ADK for the same task).
- **Diagrams** — Mermaid architecture flows from your research.
- **Demos** — One-click starter bundles (Redis, ADK, LangChain, Compare agents).
- **Light / dark theme** — Toggle in the header.
- **Voice input** — Microphone in chat (browser Web Speech API).
- **Privacy-friendly API key** — Gemini key stored in browser `localStorage` only.

---

## Quick start

### Prerequisites

- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier works for testing)

### Run locally

```bash
git clone https://github.com/tanweerGithub/dev-docs-ai.git
cd dev-docs-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First session

1. Click **Add Gemini key** (top-right) and paste your API key.
2. Add a documentation link or click **Try a demo** (e.g. Google ADK).
3. Ask a question in the Research Assistant.
4. Open **Playground**, **Comparison**, or **Diagram** tabs when the green dot appears.

---

## How to use

### Add sources

**Documentation link** — Paste any public docs URL, e.g.:

```
https://google.github.io/adk-docs/agents/
https://docs.langchain.com/oss/python/langchain/quickstart
https://www.mongodb.com/docs/languages/python/pymongo-driver/current/get-started/
```

**Upload files** — PDF, PNG, JPEG, WebP, GIF, TXT, Markdown, HTML, CSV.

**Try a demo** — Opens the demo drawer at the bottom of Sources:

| Demo | What it adds |
|------|----------------|
| Redis | Redis Python client docs + caching code |
| Google ADK | ADK agents guide + agent starter code |
| LangChain | LangChain quickstart + `create_agent` code |
| Compare agents | LangChain + ADK docs + side-by-side comparison |

Demos **append** to your source list (they do not replace existing sources).

**Clear all** — Removes all sources and resets chat, code, diagrams, and comparisons.

### Chat

- **All sources** — Default; Gemini uses every source in your list.
- **@ scope** — Type `@` and pick one source to query only that document.
- **Web search** — Toggle above the chat box:
  - **Off** (default): Your documents only. If the answer is not in your sources, the reply starts with **Not found in your sources.** and suggests enabling web search or adding docs.
  - **On**: May supplement with Google search; web citations are labeled.

### Center tabs

| Tab | When to use |
|-----|-------------|
| **Document** | Preview the selected source |
| **Playground** | View / edit generated code; Open in Colab |
| **Comparison** | LangChain vs ADK (or similar) for the same task |
| **Diagram** | Mermaid diagram from a research answer |

---

## Example prompts

### Research & concepts

```
What is Google ADK and how does it differ from a plain LLM call?
```

```
Summarize how Redis caching works based on my sources [1]
```

### Code (Playground)

```
Show me Python code to connect to Redis and cache JSON session data.
```

```
How do I create a simple tool-using agent with Google ADK?
```

If your linked doc has no runnable examples, DevDocs AI will say so **first** and suggest web search or a better doc link — it will not invent code in document-only mode.

### Comparison

```
Compare LangChain vs Google ADK for building a tool-using agent — same task, side by side.
```

### Diagrams

```
Draw a mermaid diagram of how a Python app connects to MongoDB Atlas using PyMongo.
```

Pair diagram prompts with related docs, e.g. PyMongo get-started + connection guide.

### Scoped query

```
@Google ADK — Agents
Does this page include multi-agent workflow code examples?
```

---

## Architecture

```
Browser (Next.js)
  ├── Sources panel      → local state + localStorage (API key, web search pref)
  ├── Research chat      → POST /api/chat
  └── Center canvas      → code, comparison, diagram from API response

/api/chat → gemini-2.5-flash
  ├── Inline files (PDF, images, text)
  ├── url_context (user's linked URLs)
  └── google_search (only when Web search toggle is ON)
```

| Route | Role |
|-------|------|
| `POST /api/chat` | Gemini research + JSON artifacts |
| `GET /api/page-title` | Resolve meaningful names for doc URLs |
| `GET /api/embed-check` | Detect iframe embed restrictions |
| `POST /api/colab` | Build Colab notebook links |

---

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **AI:** Google Gemini API (`gemini-2.5-flash`)
- **Editor:** Monaco
- **Diagrams:** Mermaid
- **Deploy:** Vercel

---

## Environment variables

For local server-side fallback (optional — users normally supply a key in the UI):

```bash
GEMINI_API_KEY=your_key_here
```

---

## Scripts

```bash
npm run dev    # Development server
npm run build  # Production build
npm run start  # Start production server
npm run lint   # ESLint
```

---

## Deploy

Push to `main` on GitHub; Vercel deploys automatically when the repo is connected.

Manual deploy:

```bash
npx vercel deploy --prod
```

Ensure production Git author email matches your GitHub account if Vercel deployment protection is enabled.

---

## Project structure

```
src/
├── app/              # Next.js routes + API
├── components/
│   ├── canvas/       # Document, Playground, Comparison, Diagram
│   ├── layout/       # App shell
│   ├── panels/       # Sources, Research Assistant
│   └── settings/     # API key modal
├── context/          # App + theme state
├── data/             # Demos, welcome message
└── lib/              # Gemini, citations, Mermaid helpers
```

---

## License

Private project — see repository owner for terms.