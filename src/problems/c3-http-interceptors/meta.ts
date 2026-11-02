import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c3-http-interceptors',
  catalogId: 'C3',
  title: 'HTTP interceptors + token refresh',
  theme: 'Middleware',
  difficulty: 'Hard',
  inspiredBy: 'axios interceptors, ky hooks',
  tags: [
    { kind: 'library', name: 'axios' },
    { kind: 'library', name: 'ky' },
    { kind: 'pattern', name: 'Interceptors' },
    { kind: 'pattern', name: 'Token refresh' },
    { kind: 'pattern', name: 'Request deduplication' },
  ],
  summary: 'An axios-style client with ordered request/response interceptors, then a 401 handler that refreshes the token exactly once for many concurrent requests.',
  stages: [
    { title: 'Client + adapter', summary: 'request() with baseURL, non-2xx → HttpError, injected adapter.', groups: ['Client + adapter'] },
    { title: 'Interceptors', summary: 'use/eject; request interceptors run last-added-first, response in order; errors flow through rejected handlers.', groups: ['Interceptors'] },
    { title: 'Auth header + 401 retry', summary: 'Add the bearer token; on 401 refresh and retry once.', groups: ['Auth header + 401 retry'] },
    { title: 'Single-flight refresh', summary: 'Concurrent 401s share one refresh; new requests wait for it; stale-token 401s retry without refreshing; refresh failure rejects all.', groups: ['Single-flight refresh'] },
  ],
};
