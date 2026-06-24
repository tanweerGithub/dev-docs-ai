"use client";

import { BookMarked } from "lucide-react";
import { AppProvider, useApp } from "@/context/AppContext";
import { AgentChat } from "@/components/panels/AgentChat";
import { ResourcePanel } from "@/components/panels/ResourcePanel";
import { CenterCanvas } from "@/components/canvas/CenterCanvas";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";

function Header() {
  const { resources } = useApp();

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 p-1.5">
          <BookMarked className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-sm font-bold">
          DevDocs <span className="text-blue-400">AI</span>
        </h1>
      </div>
      <span className="hidden text-[10px] text-zinc-600 sm:inline">
        Multi-Document Research & Q&A Assistant
      </span>
      <div className="ml-auto flex items-center gap-2">
        <ApiKeySettings />
        <span className="text-[10px] text-zinc-500">
          {resources.length} source{resources.length === 1 ? "" : "s"}
        </span>
      </div>
    </header>
  );
}

function Shell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Header />
      <div className="flex min-h-0 flex-1">
        <ResourcePanel />
        <CenterCanvas />
        <AgentChat />
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}