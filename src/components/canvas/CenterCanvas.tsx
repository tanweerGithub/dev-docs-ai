"use client";

import { BookOpen, Code2, GitCompare, Network } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { CanvasTab } from "@/types";
import { ComparisonView } from "./ComparisonView";
import { DiagramView } from "./DiagramView";
import { DocumentPreview } from "./DocumentPreview";
import { Playground } from "./Playground";

const TABS: { id: CanvasTab; label: string; icon: typeof BookOpen; badge?: boolean }[] = [
  { id: "document", label: "Document", icon: BookOpen },
  { id: "playground", label: "Playground", icon: Code2, badge: true },
  { id: "comparison", label: "Comparison", icon: GitCompare, badge: true },
  { id: "diagram", label: "Diagram", icon: Network, badge: true },
];

export function CenterCanvas() {
  const { activeTab, setActiveTab, code, comparison, diagram } = useApp();

  const hasContent = {
    playground: !!code,
    comparison: !!comparison,
    diagram: !!diagram,
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-900">
      <div className="flex items-center border-b border-zinc-800 px-2">
        {TABS.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === id
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge && hasContent[id as keyof typeof hasContent] && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "document" && <DocumentPreview />}
        {activeTab === "playground" && <Playground />}
        {activeTab === "comparison" && <ComparisonView />}
        {activeTab === "diagram" && <DiagramView />}
      </div>
    </main>
  );
}