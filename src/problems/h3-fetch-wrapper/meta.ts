import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h3-fetch-wrapper',
  catalogId: 'H3',
  title: 'Fetch wrapper',
  theme: 'API/Network',
  difficulty: 'Medium',
  inspiredBy: 'ky, ofetch',
  summary: 'A small ky-style client over an injected fetch: prefixUrl and searchParams, HTTPError, retries that honor Retry-After, request/response/error hooks, timeouts with AbortSignal, and extend() with merged headers.',
  stages: [
    { title: 'Requests', summary: 'api.get(url).json() with prefixUrl and searchParams; non-2xx throws HTTPError.' },
    { title: 'Retries', summary: 'Retry idempotent methods on 408/429/5xx, honoring Retry-After in seconds or as a date.' },
    { title: 'Hooks', summary: 'beforeRequest, afterResponse (can return a new response) and beforeError.' },
    { title: 'Timeouts and extend', summary: 'A timeout combined with your AbortSignal, and api.extend() with deep-merged headers.' },
  ],
};
