"use client";

import dynamic from "next/dynamic";
import { Check, Code2, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { ArtifactBanner } from "@/components/shared/ArtifactBanner";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { openInColab } from "@/lib/colab";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
      Loading editor...
    </div>
  ),
});

export function Playground() {
  const { code, codeMeta, comparison } = useApp();
  const { isLight } = useTheme();
  const [copied, setCopied] = useState(false);
  const [colabHint, setColabHint] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleColab = () => {
    if (!code) return;
    const result = openInColab(code.code, code.language);
    if (result.mode === "clipboard") {
      setColabHint("Code copied — paste into the new Colab notebook.");
      setTimeout(() => setColabHint(null), 5000);
    } else if (window.location.hostname === "localhost") {
      setColabHint(
        "Colab cannot fetch localhost — deploy to Vercel or copy code manually."
      );
      setTimeout(() => setColabHint(null), 6000);
    } else {
      setColabHint("Opening Colab with your code in a new notebook…");
      setTimeout(() => setColabHint(null), 4000);
    }
  };

  const showColab =
    code &&
    ["python", "py", "ipython"].includes(code.language.toLowerCase());

  if (comparison) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Code2 className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">Code is in Comparison</p>
        <p className="max-w-sm text-xs text-zinc-600">
          This query has side-by-side code for the same task. Open the
          Comparison tab — Playground is for single-framework snippets only.
        </p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Code2 className="h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-400">No code yet</p>
        <p className="max-w-sm text-xs text-zinc-600">
          Ask for implementation help in chat — e.g. &ldquo;show me how to set up
          a Redis client&rdquo; — and code will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ArtifactBanner meta={codeMeta} />
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-500">
          {colabHint ?? "From your research query"}
        </span>
        <div className="flex items-center gap-2">
          {showColab && (
            <button
              onClick={handleColab}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <ExternalLink className="h-3 w-3" />
              Open in Colab
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            {code.language}
          </span>
        </div>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={code.language}
          value={code.code}
          theme={isLight ? "vs" : "vs-dark"}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}