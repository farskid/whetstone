import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c6-loader-chain',
  catalogId: 'C6',
  title: 'Loader chain with pitching',
  theme: 'Middleware',
  difficulty: 'Hard',
  inspiredBy: 'webpack loaders (loader-runner)',
  tags: [
    { kind: 'library', name: 'webpack' },
    { kind: 'library', name: 'loader-runner' },
    { kind: 'pattern', name: 'Loader chain' },
    { kind: 'pattern', name: 'Middleware' },
  ],
  summary: 'Run webpack-style loaders right to left with sync, promise and this.async() results, query options, a left-to-right pitch phase that can short-circuit, shared data and dependencies.',
  stages: [
    { title: 'Loader chain', summary: 'Apply loaders right to left to the resource.', groups: ['Loader chain'] },
    { title: 'Async and options', summary: 'this.async() or a promise, options from "loader?x=1", errors that name the loader.', groups: ['Async and options'] },
    { title: 'Pitch phase', summary: 'pitch runs left to right first; a returned value skips the rest and the resource read.', groups: ['Pitch phase'] },
    { title: 'Data and dependencies', summary: 'this.data shared by pitch and normal phase; this.addDependency collects files.', groups: ['Data and dependencies'] },
  ],
};
