import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f4-text-diff',
  catalogId: 'F4',
  title: 'Text diff',
  theme: 'Utilities',
  difficulty: 'Hard',
  inspiredBy: 'jsdiff, GNU diff',
  summary: 'A Myers line diff, word diff, unified patches with context and no-newline markers, and applying patches at an offset.',
  stages: [
    { title: 'Line diff', summary: 'Minimal line changes, merged, removes before adds.' },
    { title: 'Unified patch', summary: 'Hunks with context, headers and no-newline markers.' },
    { title: 'Apply', summary: 'Apply hunks at their position or a shifted one; detect conflicts.' },
    { title: 'Scale', summary: 'Words, and 10,000-line files in a time budget.' },
  ],
};
