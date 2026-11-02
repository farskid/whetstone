import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e2-signals',
  catalogId: 'E2',
  title: 'Signals',
  theme: 'State',
  difficulty: 'Hard',
  inspiredBy: 'Preact Signals, SolidJS',
  tags: [
    { kind: 'library', name: 'Preact Signals' },
    { kind: 'framework', name: 'Preact' },
    { kind: 'framework', name: 'SolidJS' },
    { kind: 'pattern', name: 'Signals' },
    { kind: 'pattern', name: 'Fine-grained reactivity' },
  ],
  summary: 'Fine-grained reactivity: signal, lazy computed, effects, batching and glitch-free updates.',
  stages: [
    { title: 'Signal and computed', summary: 'signal(v) with .value get/set and computed(fn) that is lazy and cached.', groups: ['Signal and computed'] },
    { title: 'Effects', summary: 'effect(fn) tracks deps and re-runs on change; cleanup functions and a dispose function.', groups: ['Effects'] },
    { title: 'Batching and glitch-free', summary: 'batch(fn) and glitch-free updates: in a diamond, D computes once and never sees inconsistent state.', groups: ['Batching and glitch-free'] },
    { title: 'Dynamic deps, untracked, errors, cycles', summary: 'Dynamic dependencies, untracked(), computeds that throw, and cycle detection.', groups: ['Dynamic deps, untracked, errors, cycles'] },
  ],
};
