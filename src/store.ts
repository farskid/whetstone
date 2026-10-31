import { useSyncExternalStore } from 'react';
import type { Language } from './runner/types';

/** Everything the site remembers. Lives in localStorage only. */
export interface Progress {
  version: 1;
  theme: 'dark' | 'light';
  lang: Language;
  code: Record<string, Partial<Record<Language, string>>>;
  solved: Record<string, { at: string; lang: Language }>;
  attempts: Record<string, number>;
  revealed: Record<string, boolean>;
}

const KEY = 'practical:v1';
const empty = (): Progress => ({ version: 1, theme: 'dark', lang: 'ts', code: {}, solved: {}, attempts: {}, revealed: {} });

function normalize(raw: any): Progress {
  const base = empty();
  if (!raw || typeof raw !== 'object') return base;
  return {
    version: 1,
    theme: raw.theme === 'light' ? 'light' : 'dark',
    lang: raw.lang === 'js' ? 'js' : 'ts',
    code: typeof raw.code === 'object' && raw.code ? raw.code : {},
    solved: typeof raw.solved === 'object' && raw.solved ? raw.solved : {},
    attempts: typeof raw.attempts === 'object' && raw.attempts ? raw.attempts : {},
    revealed: typeof raw.revealed === 'object' && raw.revealed ? raw.revealed : {},
  };
}

function load(): Progress {
  try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return empty(); }
}

let state = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  }, 150);
}
window.addEventListener('beforeunload', () => { clearTimeout(saveTimer); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} });

export function update(fn: (s: Progress) => Progress) {
  state = fn(state);
  document.documentElement.dataset.theme = state.theme;
  save();
  listeners.forEach((l) => l());
}

export function useProgress(): Progress {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}

export const actions = {
  setTheme: (theme: Progress['theme']) => update((s) => ({ ...s, theme })),
  setLang: (lang: Language) => update((s) => ({ ...s, lang })),
  setCode: (id: string, lang: Language, code: string) =>
    update((s) => ({ ...s, code: { ...s.code, [id]: { ...s.code[id], [lang]: code } } })),
  resetCode: (id: string, lang: Language) =>
    update((s) => { const c = { ...s.code[id] }; delete c[lang]; return { ...s, code: { ...s.code, [id]: c } }; }),
  recordAttempt: (id: string, passedAll: boolean, lang: Language) =>
    update((s) => ({
      ...s,
      attempts: { ...s.attempts, [id]: (s.attempts[id] ?? 0) + 1 },
      solved: passedAll && !s.solved[id] ? { ...s.solved, [id]: { at: new Date().toISOString(), lang } } : s.solved,
    })),
  reveal: (id: string) => update((s) => ({ ...s, revealed: { ...s.revealed, [id]: true } })),
  exportJson: () => JSON.stringify({ app: 'practical', exportedAt: new Date().toISOString(), ...state }, null, 2),
  importJson: (text: string) => {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || (parsed.app && parsed.app !== 'practical')) throw new Error('This file is not a progress export from this site.');
    update(() => normalize(parsed));
  },
  resetAll: () => update(() => ({ ...empty(), theme: state.theme })),
};
