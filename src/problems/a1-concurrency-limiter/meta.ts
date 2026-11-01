import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a1-concurrency-limiter',
  catalogId: 'A1',
  title: 'Concurrency limiter',
  theme: 'Async',
  difficulty: 'Medium',
  inspiredBy: 'p-limit, p-queue',
  tags: [
    { kind: 'library', name: 'p-limit' },
    { kind: 'library', name: 'p-queue' },
    { kind: 'pattern', name: 'Concurrency limit' },
    { kind: 'pattern', name: 'Priority queue' },
    { kind: 'pattern', name: 'Cancellation' },
  ],
  summary: 'Run async tasks with at most N in flight, with priorities, abort signals, live concurrency changes and onIdle().',
  stages: [
    { title: 'Limit in-flight tasks', summary: 'run(fn) returns fn’s result; at most N run at once, FIFO.' },
    { title: 'Introspection', summary: 'activeCount, pendingCount and onIdle().' },
    { title: 'Priorities and clearQueue', summary: 'Higher priority starts first; clearQueue() rejects everything still queued.' },
    { title: 'Abort and live concurrency', summary: 'AbortSignal per task and a settable concurrency.' },
  ],
};
