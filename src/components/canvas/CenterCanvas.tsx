"use client";

import { BookOpen, GitCompare, Layers, Terminal } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { CanvasTab } from "@/types";
import { ArchDesigner } from "./ArchDesigner";
import { ApiComparison } from "./ApiComparison";
import { DocumentReader } from "./DocumentReader";
import { NextStepGuide } from "./NextStepGuide";
import { Playground } from "./Playground";

const TABS: { id: CanvasTab; label: string; icon: typeof Layers }[] = [
  { id: "reader", label: "Document", icon: BookOpen },
  { id: "playground", label: "Playground", icon: Terminal },
  { id: "comparison", label: "Comparison", icon: GitCompare },
  { id: "arch", label: "Arch Designer", icon: Layers },
];

export function CenterCanvas() {
  const { activeTab, setActiveTab, readyCount } = useApp();

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-900">
      <div className="flex items-center border-b border-zinc-800 px-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === id
                ? "border-blue-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "reader" && readyCount > 0 && (
              <span className="rounded-full bg-zinc-800 px-1.5 text-[9px] text-zinc-400">
                {readyCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <NextStepGuide />

      <div className="flex-1 overflow-hidden">
        {activeTab === "reader" && <DocumentReader />}
        {activeTab === "playground" && <Playground />}
        {activeTab === "comparison" && <ApiComparison />}
        {activeTab === "arch" && <ArchDesigner />}
      </div>
    </main>
  );
}