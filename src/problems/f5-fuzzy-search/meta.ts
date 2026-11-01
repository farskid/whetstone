import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f5-fuzzy-search',
  catalogId: 'F5',
  title: 'Fuzzy search',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'fzf, Fuse.js, VS Code quick open',
  summary: 'Score subsequence matches with boundary, camelCase and consecutive bonuses, pick the best alignment, highlight it, and rank items across weighted keys with optional typo tolerance.',
  stages: [
    { title: 'Matching', summary: 'Case- and accent-insensitive subsequence matching.' },
    { title: 'Scoring', summary: 'Bonuses and gap penalties; the best alignment wins.' },
    { title: 'Highlights', summary: 'Positions and merged ranges in the original text.' },
    { title: 'Ranking', summary: 'Weighted keys, stable order, limit and one-typo tolerance.' },
  ],
};
