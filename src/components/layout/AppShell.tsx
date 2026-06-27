"use client";

import { useEffect, useState } from "react";
import { BookMarked, Moon, Sun } from "lucide-react";
import { AppProvider, useApp } from "@/context/AppContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { AgentChat } from "@/components/panels/AgentChat";
import { ResourcePanel } from "@/components/panels/ResourcePanel";
import { CenterCanvas } from "@/components/canvas/CenterCanvas";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import {
  getOnboardingDismissed,
  setOnboardingDismissed,
} from "@/lib/onboarding-storage";

function Header() {
  const { resources } = useApp();
  const { isLight, toggleTheme } = useTheme();

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
        Multi-Document Research for Technical Docs
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="rounded-lg border border-zinc-700 p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
        >
          {isLight ? (
            <Moon className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
        </button>
        <ApiKeySettings />
        <span className="text-[10px] text-zinc-500">
          {resources.length} source{resources.length === 1 ? "" : "s"}
        </span>
      </div>
    </header>
  );
}

function Shell() {
  const { theme } = useTheme();
  const { apiKey, setApiKey, loadDemo } = useApp();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!apiKey && !getOnboardingDismissed()) {
      setShowWelcome(true);
    }
  }, [apiKey]);

  const closeWelcome = () => {
    setOnboardingDismissed(true);
    setShowWelcome(false);
  };

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    closeWelcome();
  };

  const handleTryDemo = () => {
    loadDemo("langchain");
    closeWelcome();
  };

  return (
    <div
      data-theme={theme}
      className="theme-root flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100"
    >
      <Header />
      <div className="flex min-h-0 flex-1">
        <ResourcePanel />
        <CenterCanvas />
        <AgentChat />
      </div>

      {showWelcome && (
        <WelcomeModal
          onSave={handleSaveKey}
          onTryDemo={handleTryDemo}
          onDismiss={closeWelcome}
        />
      )}
    </div>
  );
}

export function AppShell() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ThemeProvider>
  );
}