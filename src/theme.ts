import { useSyncExternalStore } from 'react';

/** What the user picked in the header. "system" follows the OS setting. */
export type ThemePref = 'dark' | 'light' | 'system';
/** What the page actually shows (`<html data-theme>`, the CSS and Monaco only know these two). */
export type ResolvedTheme = 'dark' | 'light';

export const THEME_PREFS: readonly ThemePref[] = ['system', 'dark', 'light'];

const query = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

/** The OS theme. Browsers without matchMedia get dark, the site's default. */
export function systemTheme(): ResolvedTheme {
  return query && !query.matches ? 'light' : 'dark';
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref;
}

function subscribe(onChange: () => void) {
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/** The resolved theme for a preference; re-renders live when the OS theme changes. */
export function useResolvedTheme(pref: ThemePref): ResolvedTheme {
  const system = useSyncExternalStore(subscribe, systemTheme, () => 'dark' as const);
  return pref === 'system' ? system : pref;
}
