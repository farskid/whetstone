import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e6-query-cache',
  catalogId: 'E6',
  title: 'Query cache',
  theme: 'Data/Caches',
  difficulty: 'Hard',
  inspiredBy: 'TanStack Query, SWR',
  summary: 'Server-state cache: stable keys, dedupe, staleTime, observers, prefix invalidation that drops stale responses, retries, GC.',
  stages: [
    { title: 'Keyed cache + dedupe', summary: 'fetchQuery(key, fn) caches by a stable key hash and dedupes in-flight requests.' },
    { title: 'Staleness', summary: 'staleTime decides when cached data is served vs refetched; setQueryData writes directly.' },
    { title: 'Observers + invalidation', summary: 'watch() subscribes to a key; invalidateQueries(prefix) refetches active queries and ignores superseded responses.' },
    { title: 'Retries + garbage collection', summary: 'Retry with backoff on an injected clock; unobserved queries are removed after gcTime.' },
  ],
};
