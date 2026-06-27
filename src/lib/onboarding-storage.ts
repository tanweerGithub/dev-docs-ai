const STORAGE_KEY = "devdocs-onboarding-dismissed";

export function getOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setOnboardingDismissed(dismissed: boolean): void {
  localStorage.setItem(STORAGE_KEY, dismissed ? "true" : "false");
}