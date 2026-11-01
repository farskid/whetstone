import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h1-batching-loader',
  catalogId: 'H1',
  title: 'Batching loader',
  theme: 'API/Network',
  difficulty: 'Medium',
  inspiredBy: 'dataloader',
  summary: 'Collect load(key) calls into one batch call, cache per key without caching errors, split by maxBatchSize, take a custom schedule, and support clear, prime, cacheKeyFn and loadMany.',
  stages: [
    { title: 'Batching', summary: 'load() calls in the same synchronous run become one batchFn(keys) call.' },
    { title: 'Cache and errors', summary: 'A per-key cache; Error values reject one key; a length mismatch is an error.' },
    { title: 'Scheduling', summary: 'maxBatchSize and a custom batchScheduleFn (for example a 10 ms window).' },
    { title: 'Cache control', summary: 'clear, clearAll, prime, cacheKeyFn for object keys, and loadMany with mixed results.' },
  ],
};
