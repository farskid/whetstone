import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h2-rate-limiter',
  catalogId: 'H2',
  title: 'Rate limiter',
  theme: 'API/Network',
  difficulty: 'Medium',
  inspiredBy: 'token bucket, rate-limiter-flexible',
  tags: [
    { kind: 'library', name: 'rate-limiter-flexible' },
    { kind: 'pattern', name: 'Rate limiting' },
    { kind: 'pattern', name: 'Token bucket' },
    { kind: 'pattern', name: 'Sliding window' },
  ],
  summary: 'A token bucket with fractional refill and a fair FIFO wait with AbortSignal, per-key buckets with idle eviction, and a sliding-window counter that reports remaining, resetAt and retryAfter.',
  stages: [
    { title: 'Token bucket', summary: 'TokenBucket({ capacity, refillPerSec }) with tryRemove(n) on an injected clock.' },
    { title: 'Per-key limiters', summary: 'Buckets created lazily per key and dropped when idle.' },
    { title: 'Sliding window', summary: 'A sliding-window counter returning { allowed, remaining, resetAt, retryAfter }.' },
    { title: 'Waiting in line', summary: 'removeTokens(n) waits in a fair FIFO queue and can be aborted.' },
  ],
};
