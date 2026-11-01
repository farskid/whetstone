import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'a6-pmap',
  catalogId: 'A6',
  title: 'Ordered concurrent map',
  theme: 'Async',
  difficulty: 'Medium',
  inspiredBy: 'p-map',
  tags: [
    { kind: 'library', name: 'p-map' },
    { kind: 'pattern', name: 'Concurrency limit' },
    { kind: 'pattern', name: 'Async iteration' },
  ],
  summary: 'Map over sync or async iterables with a concurrency cap, ordered results, pMapSkip, stopOnError and abort.',
  stages: [
    { title: 'Ordered results with a cap', summary: 'pMap(items, mapper, { concurrency }) keeps results in input order.' },
    { title: 'Lazy input and pMapSkip', summary: 'Pull from sync or async iterables only as slots free up; pMapSkip leaves an item out.' },
    { title: 'Errors', summary: 'stopOnError (default) rejects fast and starts nothing new; false collects an AggregateError.' },
    { title: 'Abort', summary: 'signal rejects with its reason and stops starting new calls.' },
  ],
};
