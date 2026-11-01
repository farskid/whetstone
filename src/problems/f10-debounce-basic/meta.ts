import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f10-debounce-basic',
  catalogId: 'F10',
  title: 'Debounce (basic)',
  theme: 'Utilities',
  difficulty: 'Easy',
  inspiredBy: 'lodash.debounce',
  tags: [
    { kind: 'library', name: 'lodash' },
    { kind: 'pattern', name: 'Debounce' },
  ],
  summary: 'Warm-up (~5 min): debounce(fn, wait). Every call restarts the timer; after wait ms of silence, call fn once with the latest args.',
  stages: [
    { title: 'Trailing call', summary: 'After wait ms with no calls, call fn once.' },
    { title: 'Latest args and this', summary: 'The call uses the latest arguments and `this`.' },
  ],
};
