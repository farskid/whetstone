import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h8-http-cache',
  catalogId: 'H8',
  title: 'HTTP response cache',
  theme: 'API/Network',
  difficulty: 'Hard',
  inspiredBy: 'RFC 9111, cacache',
  tags: [
    { kind: 'library', name: 'cacache' },
    { kind: 'pattern', name: 'HTTP caching (RFC 9111)' },
    { kind: 'pattern', name: 'Revalidation' },
    { kind: 'pattern', name: 'Stale-while-revalidate' },
  ],
  summary: 'An RFC 9111-style HTTP cache in front of fetch: freshness from Cache-Control, Expires and the Last-Modified heuristic, Age math, ETag/Last-Modified revalidation, Vary variants, private vs shared rules, and stale-while-revalidate / stale-if-error.',
  stages: [
    { title: 'Freshness', summary: 'Store cacheable GET responses and serve them while fresh, with correct Age.' },
    { title: 'Revalidation', summary: 'Send conditional requests and merge 304 responses into the stored copy.' },
    { title: 'Vary and privacy', summary: 'Keep variants per Vary header and honor no-store, private and s-maxage.' },
    { title: 'Stale responses', summary: 'stale-while-revalidate in the background and stale-if-error on failures.' },
  ],
};
