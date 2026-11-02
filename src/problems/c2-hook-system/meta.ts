import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c2-hook-system',
  catalogId: 'C2',
  title: 'Hook system',
  theme: 'Middleware',
  difficulty: 'Hard',
  inspiredBy: 'tapable, Rollup plugin hooks',
  tags: [
    { kind: 'library', name: 'tapable' },
    { kind: 'library', name: 'webpack' },
    { kind: 'library', name: 'Rollup' },
    { kind: 'pattern', name: 'Plugin hooks' },
    { kind: 'pattern', name: 'Interceptors' },
  ],
  summary: 'tapable-style plugin hooks: sync, waterfall and bail hooks, async series and parallel hooks, stage/before ordering and interceptors.',
  stages: [
    { title: 'SyncHook', summary: 'tap(name, fn) and call(...args) in registration order.', groups: ['SyncHook'] },
    { title: 'Waterfall and bail', summary: 'Return values feed the next tap, or the first non-undefined return stops the call.', groups: ['Waterfall and bail'] },
    { title: 'Async hooks', summary: 'AsyncSeriesHook and AsyncParallelHook with tapPromise.', groups: ['Async hooks'] },
    { title: 'Ordering and interceptors', summary: '{ stage, before } placement and intercept({ call, tap }).', groups: ['Ordering and interceptors'] },
  ],
};
