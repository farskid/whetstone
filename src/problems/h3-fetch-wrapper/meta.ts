import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h3-fetch-wrapper',
  catalogId: 'H3',
  title: 'Fetch wrapper',
  theme: 'API/Network',
  difficulty: 'Medium',
  inspiredBy: 'ky, ofetch',
  tags: [
    { kind: 'library', name: 'ky' },
    { kind: 'library', name: 'ofetch' },
    { kind: 'pattern', name: 'HTTP client' },
    { kind: 'pattern', name: 'Retry' },
    { kind: 'pattern', name: 'Exponential backoff' },
    { kind: 'pattern', name: 'Hooks' },
  ],
  summary: 'A small ky-style client over an injected fetch: prefixUrl and searchParams, HTTPError, retries that honor Retry-After, request/response/error hooks, timeouts with AbortSignal, and extend() with merged headers.',
  stages: [
    { title: 'Requests', summary: 'api.get(url).json() with prefixUrl and searchParams; non-2xx throws HTTPError.', groups: ['Requests'] },
    { title: 'Retries', summary: 'Retry idempotent methods on 408/429/5xx, honoring Retry-After in seconds or as a date.', groups: ['Retries'] },
    { title: 'Hooks', summary: 'beforeRequest, afterResponse (can return a new response) and beforeError.', groups: ['Hooks'] },
    { title: 'Timeouts and extend', summary: 'A timeout combined with your AbortSignal, and api.extend() with deep-merged headers.', groups: ['Timeouts and extend'] },
  ],
};
