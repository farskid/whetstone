import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e6-query-cache',
  catalogId: 'E6',
  title: 'Query cache',
  theme: 'Data/Caches',
  difficulty: 'Hard',
  inspiredBy: 'TanStack Query, SWR',
  tags: [
    { kind: 'library', name: 'TanStack Query' },
    { kind: 'library', name: 'SWR' },
    { kind: 'company', name: 'Vercel' },
    { kind: 'pattern', name: 'Query cache' },
    { kind: 'pattern', name: 'Request deduplication' },
    { kind: 'pattern', name: 'Stale-while-revalidate' },
    { kind: 'pattern', name: 'Garbage collection' },
  ],
  summary: 'Server-state cache: stable keys, dedupe, staleTime, observers, prefix invalidation that drops stale responses, retries, GC.',
  stages: [
    { title: 'Keyed cache and dedupe', summary: 'fetchQuery(key, fn) caches by a stable key hash and dedupes in-flight requests.', groups: ['Keyed cache and dedupe'] },
    { title: 'Staleness and setQueryData', summary: 'staleTime decides when cached data is served vs refetched; setQueryData writes directly.', groups: ['Staleness and setQueryData'] },
    { title: 'Observers and invalidation', summary: 'watch() subscribes to a key; invalidateQueries(prefix) refetches active queries and ignores superseded responses.', groups: ['Observers and invalidation'] },
    { title: 'Retries and garbage collection', summary: 'Retry with backoff on an injected clock; unobserved queries are removed after gcTime.', groups: ['Retries and garbage collection'] },
  ],
};
