import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a8-task-graph',
  catalogId: 'A8',
  title: 'Task graph runner',
  theme: 'Async',
  difficulty: 'Hard',
  inspiredBy: 'Turborepo, Nx, Listr',
  tags: [
    { kind: 'library', name: 'Turborepo' },
    { kind: 'library', name: 'Nx' },
    { kind: 'library', name: 'Listr' },
    { kind: 'company', name: 'Vercel' },
    { kind: 'pattern', name: 'Topological sort' },
    { kind: 'pattern', name: 'Concurrency limit' },
  ],
  summary: 'Run dependent async tasks with max parallelism, cycle detection, skip-on-failure, failFast with abort, and targets.',
  stages: [
    { title: 'Topological run', summary: 'Each task starts once all its deps succeeded and receives their results.', groups: ['Topological run'] },
    { title: 'Validation', summary: 'Duplicate ids, unknown deps, and cycles reported with their path.', groups: ['Validation'] },
    { title: 'Failures', summary: 'Dependents of a failed task are skipped; failFast aborts the rest.', groups: ['Failures'] },
    { title: 'Concurrency, targets, events', summary: 'Concurrency limit with input-order priority, targets subset and lifecycle events.', groups: ['Concurrency, targets, events'] },
  ],
};
