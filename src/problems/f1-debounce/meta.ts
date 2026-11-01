import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f1-debounce',
  catalogId: 'F1',
  title: 'Debounce',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'lodash.debounce',
  tags: [
    { kind: 'library', name: 'lodash' },
    { kind: 'pattern', name: 'Debounce' },
  ],
  summary: 'debounce(fn, wait) with leading/trailing options, cancel() and pending(), on an injected clock.',
  stages: [
    { title: 'Trailing debounce', summary: 'debounce(fn, wait): one trailing call with the latest args and `this`.', groups: ['Trailing debounce'] },
    { title: 'Leading and trailing', summary: '{ leading, trailing } options.', groups: ['Leading and trailing'] },
    { title: 'cancel() and pending()', summary: 'Drop a scheduled call; report whether one is waiting.', groups: ['cancel() and pending()'] },
  ],
};
