import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a2-retry-backoff',
  catalogId: 'A2',
  title: 'Retry with backoff',
  theme: 'Async',
  difficulty: 'Medium',
  inspiredBy: 'p-retry',
  tags: [
    { kind: 'library', name: 'p-retry' },
    { kind: 'pattern', name: 'Retry' },
    { kind: 'pattern', name: 'Exponential backoff' },
    { kind: 'pattern', name: 'Cancellation' },
  ],
  summary: 'Retry a flaky async call with exponential backoff, jitter, shouldRetry, AbortError, onFailedAttempt and an AbortSignal.',
  stages: [
    { title: 'Retry until success', summary: 'retry(fn, { retries }) calls fn(attempt) until it resolves, or rejects with the last error.', groups: ['Retry until success'] },
    { title: 'Exponential backoff', summary: 'minTimeout, factor, maxTimeout and optional full jitter with an injectable random.', groups: ['Exponential backoff'] },
    { title: 'Stopping early', summary: 'shouldRetry(err), and throwing AbortError stops right away with the original error.', groups: ['Stopping early'] },
    { title: 'Abort and hooks', summary: 'signal cancels during a backoff wait; onFailedAttempt({ error, attempt, retriesLeft }), and if it throws, stop.', groups: ['Abort and hooks'] },
  ],
};
