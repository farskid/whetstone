import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h7-webhooks',
  catalogId: 'H7',
  title: 'Webhook verify & idempotency',
  theme: 'API/Network',
  difficulty: 'Medium',
  inspiredBy: 'Stripe webhooks',
  tags: [
    { kind: 'company', name: 'Stripe' },
    { kind: 'pattern', name: 'Webhooks' },
    { kind: 'pattern', name: 'HMAC signatures' },
    { kind: 'pattern', name: 'Replay protection' },
    { kind: 'pattern', name: 'Idempotency' },
  ],
  summary: 'Verify Stripe-style t=…,v1=… signatures with HMAC-SHA256 and a timing-safe compare, reject replays, and process events idempotently: duplicates share one result, failures stay retryable, and stale out-of-order events are skipped.',
  stages: [
    { title: 'Signatures', summary: 'Parse the header, verify HMAC-SHA256 over `${t}.${rawBody}` with a timing-safe compare, and reject old timestamps.', groups: ['Signatures', 'Replay protection'] },
    { title: 'Idempotency', summary: 'A repeated event id returns the stored result; concurrent duplicates wait for the first.', groups: ['Idempotency'] },
    { title: 'Rotation and ordering', summary: 'Several secrets and v1 values, and per-object ordering that skips stale versions.', groups: ['Rotation and ordering'] },
  ],
};
