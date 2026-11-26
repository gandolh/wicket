import { useSyncExternalStore } from "react";

/** The theme the user picked. `system` follows the operating system, live. */
export type Theme = "light" | "dark" | "system";

/** The app's own key: one localStorage serves every app on the domain, so the name carries the app's. */
const KEY = "wicket.theme";
/** The bare key older builds used, read once to carry the choice over and never written. */
const LEGACY_THEME_KEY = "theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readLegacyTheme(): Theme | null {
  const value = localStorage.getItem(LEGACY_THEME_KEY);
  return isTheme(value) ? value : null;
}

function saved(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (isTheme(value)) return value;
    const legacy = readLegacyTheme();
    if (legacy === null) return "light";
    localStorage.setItem(KEY, legacy);
    return legacy;
  } catch {
    return "light";
  }
}

let current: Theme = typeof window === "undefined" ? "light" : saved();
const listeners = new Set<() => void>();

/** The theme in force. */
export function getTheme(): Theme {
  return current;
}

/** Applies a theme to <html>, keeps it on this device, and tells every subscriber. */
export function setTheme(theme: Theme): void {
  current = theme;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage is blocked (a private window): the choice lasts until the tab closes.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The theme the user picked, re-rendering when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
