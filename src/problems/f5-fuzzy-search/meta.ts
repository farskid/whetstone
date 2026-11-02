import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f5-fuzzy-search',
  catalogId: 'F5',
  title: 'Fuzzy search',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'fzf, Fuse.js, VS Code quick open',
  tags: [
    { kind: 'library', name: 'fzf' },
    { kind: 'library', name: 'Fuse.js' },
    { kind: 'company', name: 'Microsoft' },
    { kind: 'pattern', name: 'Fuzzy matching' },
    { kind: 'pattern', name: 'Ranking' },
  ],
  summary: 'Score subsequence matches with boundary, camelCase and consecutive bonuses, pick the best alignment, highlight it, and rank items across weighted keys with optional typo tolerance.',
  stages: [
    { title: 'Matching', summary: 'Case- and accent-insensitive subsequence matching.', groups: ['Matching'] },
    { title: 'Scoring', summary: 'Bonuses and gap penalties; the best alignment wins.', groups: ['Scoring'] },
    { title: 'Highlights', summary: 'Positions and merged ranges in the original text.', groups: ['Highlights'] },
    { title: 'Ranking', summary: 'Weighted keys, stable order, limit and one-typo tolerance.', groups: ['Ranking'] },
  ],
};
