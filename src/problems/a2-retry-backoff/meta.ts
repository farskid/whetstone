import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a2-retry-backoff',
  catalogId: 'A2',
  title: 'Retry with backoff',
  theme: 'Async',
  difficulty: 'Medium',
  inspiredBy: 'p-retry',
  summary: 'Retry a flaky async call with exponential backoff, jitter, shouldRetry, AbortError, onFailedAttempt and an AbortSignal.',
  stages: [
    { title: 'Retry until success', summary: 'retry(fn, { retries }) calls fn(attempt) until it resolves, or rejects with the last error.' },
    { title: 'Exponential backoff', summary: 'minTimeout, factor, maxTimeout and optional full jitter with an injectable random.' },
    { title: 'Stopping early', summary: 'shouldRetry(err), and throwing AbortError stops right away with the original error.' },
    { title: 'Abort and hooks', summary: 'signal cancels during a backoff wait; onFailedAttempt({ error, attempt, retriesLeft }), and if it throws, stop.' },
  ],
};
