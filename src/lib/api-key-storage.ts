const STORAGE_KEY = "devdocs-gemini-api-key";
const LEGACY_KEY = "devdocs-openai-api-key";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
  );
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
  localStorage.removeItem(LEGACY_KEY);
}

export function clearStoredApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}