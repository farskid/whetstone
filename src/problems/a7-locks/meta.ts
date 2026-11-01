import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a7-locks',
  catalogId: 'A7',
  title: 'Mutex, semaphore, RW lock',
  theme: 'Async',
  difficulty: 'Hard',
  inspiredBy: 'async-mutex',
  tags: [
    { kind: 'library', name: 'async-mutex' },
    { kind: 'pattern', name: 'Mutex' },
    { kind: 'pattern', name: 'Semaphore' },
    { kind: 'pattern', name: 'Read/write lock' },
  ],
  summary: 'A weighted FIFO semaphore with timeouts and tryAcquire, a Mutex, and a writer-preferring read/write lock.',
  stages: [
    { title: 'Mutex', summary: 'Mutex with acquire() → release and runExclusive(fn), FIFO, release is idempotent.' },
    { title: 'Weighted semaphore', summary: 'Semaphore(capacity) with weights, strict FIFO, tryAcquire and available.' },
    { title: 'Acquire timeout', summary: 'acquire({ timeout }) gives up after ms and leaves the queue.' },
    { title: 'Read/write lock', summary: 'Many readers or one writer; a waiting writer blocks new readers.' },
  ],
};
