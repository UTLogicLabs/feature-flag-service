export type Theme = "light" | "dark" | "system";

const THEMES: readonly Theme[] = ["light", "dark", "system"];
const COOKIE_NAME = "theme";
export const THEME_CHANGE_EVENT = "themechange";

export function isTheme(value: string | undefined | null): value is Theme {
  return THEMES.includes(value as Theme);
}

export function parseThemeCookie(cookieHeader: string | null | undefined): Theme {
  if (!cookieHeader) return "system";

  const match = cookieHeader.match(/(?:^|;\s*)theme=([^;]+)/);

  let value: string | undefined;
  try {
    value = match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    value = undefined;
  }

  return isTheme(value) ? value : "system";
}

export function serializeThemeCookie(theme: Theme): string {
  const oneYear = 60 * 60 * 24 * 365;
  return `${COOKIE_NAME}=${theme}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
}

export function resolveSystemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  const isDark = theme === "dark" || (theme === "system" && resolveSystemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.dataset.theme = theme;
}

export function cycleTheme(theme: Theme): Theme {
  const order: readonly Theme[] = ["light", "system", "dark"];
  return order[(order.indexOf(theme) + 1) % order.length];
}

export function commitTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  document.cookie = serializeThemeCookie(theme);
  applyTheme(theme);
  document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
}
