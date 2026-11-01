import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a4-singleflight',
  catalogId: 'A4',
  title: 'Singleflight / request dedupe',
  theme: 'Async',
  difficulty: 'Medium',
  inspiredBy: 'Go singleflight, SWR dedupe',
  summary: 'Share one in-flight call per key, cache results with a TTL, forget keys, and serve stale while revalidating.',
  stages: [
    { title: 'Share in-flight calls', summary: 'group.do(key, fn) shares one in-flight call across concurrent callers with the same key.' },
    { title: 'Result cache with TTL', summary: 'Cache successful results for ttl ms on an injected clock. Errors are never cached.' },
    { title: 'forget(key)', summary: 'The next caller starts fresh; current waiters still get the old result.' },
    { title: 'Stale-while-revalidate', summary: 'Past staleAfter, return the cached value at once and refresh in the background, once.' },
  ],
};
