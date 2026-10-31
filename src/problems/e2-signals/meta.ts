import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e2-signals',
  catalogId: 'E2',
  title: 'Signals',
  theme: 'State',
  difficulty: 'Hard',
  inspiredBy: 'Preact Signals, SolidJS',
  summary: 'Fine-grained reactivity: signal, lazy computed, effects, batching and glitch-free updates.',
  stages: [
    { title: 'Signal and computed', summary: 'signal(v) with .value get/set and computed(fn) that is lazy and cached.' },
    { title: 'Effects', summary: 'effect(fn) tracks deps automatically and re-runs on change, returning a dispose function.' },
    { title: 'Batching and glitch-free', summary: 'batch(fn) and glitch-free updates: in a diamond, D computes once and never sees inconsistent state.' },
    { title: 'Dynamic deps, cleanup, untracked, cycles', summary: 'Dynamic dependencies, effect cleanup functions, untracked(), and cycle detection.' },
  ],
};
