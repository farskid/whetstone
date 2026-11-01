import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e4-undo-redo',
  catalogId: 'E4',
  title: 'Undo/redo history',
  theme: 'State',
  difficulty: 'Medium',
  inspiredBy: 'Editor history, zundo',
  summary: 'An undo/redo stack with typing coalescing, a capacity limit, nestable transactions, selection restore and a command-pattern variant.',
  stages: [
    { title: 'Snapshot stack', summary: 'push/undo/redo; a push after undo clears redo.' },
    { title: 'Coalescing and capacity', summary: 'Group rapid pushes with the same groupKey; drop the oldest steps.' },
    { title: 'Transactions', summary: 'begin/commit/rollback, nestable, as one undo step.' },
    { title: 'Selection and commands', summary: 'Restore selection with each step; a do/undo command history.' },
  ],
};
