import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h6-offline-queue',
  catalogId: 'H6',
  title: 'Offline mutation queue',
  theme: 'API/Network',
  difficulty: 'Hard',
  inspiredBy: 'Workbox background sync, TanStack Query offline mutations, Replicache',
  tags: [
    { kind: 'library', name: 'Workbox' },
    { kind: 'library', name: 'TanStack Query' },
    { kind: 'library', name: 'Replicache' },
    { kind: 'company', name: 'Google' },
    { kind: 'pattern', name: 'Offline queue' },
    { kind: 'pattern', name: 'Retry' },
    { kind: 'pattern', name: 'Exponential backoff' },
    { kind: 'pattern', name: 'Persistence' },
  ],
  summary: 'Persisted FIFO queue of writes made offline: sent in order when back online, retried with backoff, coalesced by key, survives reloads.',
  stages: [
    { title: 'FIFO while online', summary: 'enqueue() sends one mutation at a time, in order.' },
    { title: 'Offline + persistence', summary: 'Nothing is sent while offline; the queue is saved to storage and restored on startup.' },
    { title: 'Retries', summary: 'Retryable failures back off on the clock and block the queue; 4xx drops; max retries.' },
    { title: 'Coalescing', summary: 'A dedupeKey replaces the payload of a queued (not yet sending) mutation.' },
  ],
};
