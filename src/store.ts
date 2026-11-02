import { useSyncExternalStore } from 'react';
import type { Language } from './runner/types';
import { problemsById } from './problems';
import { stageCount } from './problems/stages';
import { resolveTheme, type ThemePref } from './theme';

type Code = Partial<Record<Language, string>>;

/** Everything the site remembers. Lives in localStorage only. */
export interface Progress {
  version: 2;
  /** The header's pick; "system" follows the OS (see src/theme.ts). Old saves only have dark/light. */
  theme: ThemePref;
  lang: Language;
  /** The editor buffer per problem. One buffer per language that carries over from stage to stage. */
  code: Record<string, Code>;
  /** The whole problem passed (single-stage: all tests; staged: the final stage, or the full problem). */
  solved: Record<string, { at: string; lang: Language }>;
  attempts: Record<string, number>;
  /** Reference solution revealed before solving (the full one / the final stage's). */
  revealed: Record<string, boolean>;
  /** Staged problems: the highest unlocked stage, 0-based. Missing = 0. */
  stage: Record<string, number>;
  /** Staged problems: when each stage was first passed (ISO time; null = not yet). */
  stagePassed: Record<string, (string | null)[]>;
  /** Staged problems: the code that passed each stage, saved when it passed ("restart this stage" resets to it). */
  stageCode: Record<string, Record<number, Code>>;
  /** Staged problems: stages whose reference was revealed before passing them. */
  stageRevealed: Record<string, number[]>;
  /** Staged problems the user switched to "full problem" (every stage unlocked, one run of everything). */
  full: Record<string, boolean>;
  /**
   * Staged problems whose saved code declares its own copies of the types in types.ts (written before the types moved
   * to their own file) and where the user chose to keep them rather than import types.ts.
   */
  ownTypes: Record<string, boolean>;
}

const KEY = 'practical:v2';
const V1_KEY = 'practical:v1';
/** F10 (basic debounce) became F1's first stage. */
const FOLDED: Record<string, { into: string; stage: number }> = { 'f10-debounce-basic': { into: 'f1-debounce', stage: 0 } };

const empty = (): Progress => ({
  version: 2, theme: 'dark', lang: 'ts', code: {}, solved: {}, attempts: {}, revealed: {},
  stage: {}, stagePassed: {}, stageCode: {}, stageRevealed: {}, full: {}, ownTypes: {},
});
const obj = (v: unknown) => (typeof v === 'object' && v && !Array.isArray(v) ? (v as Record<string, any>) : {});

/** Mark stages 0..upTo passed (keeping earlier times) and unlock the next one. */
function passThrough(s: Progress, id: string, upTo: number, at: string) {
  const n = stageCount(problemsById.get(id) ?? { stages: [] });
  if (n < 2) return;
  const passed = [...(s.stagePassed[id] ?? [])];
  for (let k = 0; k <= Math.min(upTo, n - 1); k++) passed[k] = passed[k] ?? at;
  for (let k = 0; k < n; k++) passed[k] = passed[k] ?? null;
  s.stagePassed[id] = passed;
  s.stage[id] = Math.max(s.stage[id] ?? 0, Math.min(upTo + 1, n - 1));
}

/** Accepts v2 state, v1 state (localStorage or an old export) and garbage. */
export function normalize(raw: any): Progress {
  const base = empty();
  if (!raw || typeof raw !== 'object') return base;
  const s: Progress = {
    version: 2,
    theme: raw.theme === 'light' || raw.theme === 'system' ? raw.theme : 'dark',
    lang: raw.lang === 'js' ? 'js' : 'ts',
    code: { ...obj(raw.code) },
    solved: { ...obj(raw.solved) },
    attempts: { ...obj(raw.attempts) },
    revealed: { ...obj(raw.revealed) },
    stage: { ...obj(raw.stage) },
    stagePassed: { ...obj(raw.stagePassed) },
    stageCode: { ...obj(raw.stageCode) },
    stageRevealed: { ...obj(raw.stageRevealed) },
    full: { ...obj(raw.full) },
    ownTypes: { ...obj(raw.ownTypes) },
  };
  // Folded problems: their progress counts for the stage they became.
  for (const [old, { into, stage }] of Object.entries(FOLDED)) {
    if (s.solved[old]) passThrough(s, into, stage, s.solved[old].at);
    if (s.code[old] && !s.code[into]) s.code[into] = s.code[old];
    if (s.attempts[old]) s.attempts[into] = (s.attempts[into] ?? 0) + s.attempts[old];
    for (const k of ['code', 'solved', 'attempts', 'revealed', 'stage', 'stagePassed', 'stageCode', 'stageRevealed', 'full', 'ownTypes'] as const) delete (s[k] as Record<string, unknown>)[old];
  }
  // A problem solved before it was staged (v1) is fully unlocked.
  for (const [id, v] of Object.entries(s.solved)) if (v?.at) passThrough(s, id, Infinity, v.at);
  return s;
}

function load(): Progress {
  try {
    const v2 = localStorage.getItem(KEY);
    return normalize(JSON.parse(v2 ?? localStorage.getItem(V1_KEY) ?? 'null'));
  } catch { return empty(); }
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
  document.documentElement.dataset.theme = resolveTheme(state.theme);
  save();
  listeners.forEach((l) => l());
}

/** The current state outside React (for event handlers that need the latest value). */
export function getProgress(): Progress { return state; }

export function useProgress(): Progress {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}

/** Highest unlocked stage (0-based), or the last one in full mode. */
export function unlockedStage(s: Progress, id: string): number {
  const n = stageCount(problemsById.get(id) ?? { stages: [] });
  if (n < 2) return 0;
  if (s.full[id]) return n - 1;
  return Math.max(0, Math.min(n - 1, s.stage[id] ?? 0));
}

/** How many stages are passed. */
export function passedStages(s: Progress, id: string): number {
  return (s.stagePassed[id] ?? []).filter(Boolean).length;
}

export const actions = {
  setTheme: (theme: Progress['theme']) => update((s) => ({ ...s, theme })),
  setLang: (lang: Language) => update((s) => ({ ...s, lang })),
  setCode: (id: string, lang: Language, code: string) =>
    update((s) => ({ ...s, code: { ...s.code, [id]: { ...s.code[id], [lang]: code } } })),
  resetCode: (id: string, lang: Language) =>
    update((s) => { const c = { ...s.code[id] }; delete c[lang]; return { ...s, code: { ...s.code, [id]: c } }; }),
  /**
   * One finished run. For staged problems `stage` is the stage that ran; passing it records the time, saves a snapshot of
   * the code and unlocks the next stage. Passing the final stage (or the full problem) solves the problem.
   */
  recordAttempt: (id: string, passedAll: boolean, lang: Language, stage?: number, code?: string) =>
    update((s) => {
      const next: Progress = { ...s, attempts: { ...s.attempts, [id]: (s.attempts[id] ?? 0) + 1 } };
      const n = stageCount(problemsById.get(id) ?? { stages: [] });
      if (!passedAll) return next;
      const at = new Date().toISOString();
      const k = n < 2 ? 0 : Math.min(stage ?? n - 1, n - 1);
      if (n >= 2) {
        next.stage = { ...s.stage }; next.stagePassed = { ...s.stagePassed };
        passThrough(next, id, k, at);
        if (code !== undefined) next.stageCode = { ...s.stageCode, [id]: { ...s.stageCode[id], [k]: { ...s.stageCode[id]?.[k], [lang]: code } } };
      }
      if (k === n - 1 && !s.solved[id]) next.solved = { ...s.solved, [id]: { at, lang } };
      return next;
    }),
  reveal: (id: string) => update((s) => ({ ...s, revealed: { ...s.revealed, [id]: true } })),
  revealStage: (id: string, stage: number) =>
    update((s) => ({ ...s, stageRevealed: { ...s.stageRevealed, [id]: [...new Set([...(s.stageRevealed[id] ?? []), stage])] } })),
  keepOwnTypes: (id: string) => update((s) => ({ ...s, ownTypes: { ...s.ownTypes, [id]: true } })),
  setFull: (id: string, on: boolean) => update((s) => ({ ...s, full: { ...s.full, [id]: on } })),
  exportJson: () => JSON.stringify({ app: 'practical', exportedAt: new Date().toISOString(), ...state }, null, 2),
  importJson: (text: string) => {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || (parsed.app && parsed.app !== 'practical')) throw new Error('This file is not a progress export from this site.');
    update(() => normalize(parsed));
  },
  resetAll: () => update(() => ({ ...empty(), theme: state.theme })),
};
