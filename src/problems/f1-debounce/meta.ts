import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f1-debounce',
  catalogId: 'F1',
  title: 'Debounce',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'lodash.debounce',
  summary: 'debounce(fn, wait) with leading/trailing options, cancel() and pending(), on an injected clock.',
  stages: [
    { title: 'Trailing debounce', summary: 'debounce(fn, wait): one trailing call with the latest args and `this`.' },
    { title: 'Leading and trailing', summary: '{ leading, trailing } options.' },
    { title: 'cancel() and pending()', summary: 'Drop a scheduled call; report whether one is waiting.' },
  ],
};
