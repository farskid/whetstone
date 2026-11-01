import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a9-promise-all-settled',
  catalogId: 'A9',
  title: 'Promise.allSettled',
  theme: 'Async',
  difficulty: 'Easy',
  inspiredBy: 'Promise.allSettled (ES2020)',
  tags: [
    { kind: 'pattern', name: 'Promise combinators' },
  ],
  summary: 'Warm-up (~5 min): wait for every input to settle and report each outcome in input order. Never rejects.',
  stages: [
    { title: 'Fulfilled and rejected outcomes', summary: 'Resolve with one { status, value | reason } entry per input, in input order.' },
    { title: 'Edge cases', summary: 'Plain values, thenables, any iterable, and empty input.' },
  ],
};
