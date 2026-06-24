"use client";

import dynamic from "next/dynamic";
import { Code2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
      Loading editor...
    </div>
  ),
});

export function Playground() {
  const { code } = useApp();

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
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-xs text-zinc-500">From your research query</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          {code.language}
        </span>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={code.language}
          value={code.code}
          theme="vs-dark"
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