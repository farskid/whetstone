import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd2-semver',
  catalogId: 'D2',
  title: 'Semver ranges',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'semver',
  tags: [
    { kind: 'library', name: 'semver' },
    { kind: 'pattern', name: 'Semantic versioning' },
    { kind: 'pattern', name: 'Version ranges' },
  ],
  summary: 'Parse and compare semantic versions with prerelease precedence, then match ranges: caret, tilde, comparators, x-ranges, hyphens, unions and the prerelease rule.',
  stages: [
    { title: 'Parse and compare', summary: 'Strict parsing; 1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0; build metadata ignored.' },
    { title: 'Caret, tilde, comparators', summary: '^, ~, >=, <, and space-joined ANDs.' },
    { title: 'X-ranges, hyphens, unions', summary: '1.x, *, 1.2 - 2.3.4, and ||.' },
    { title: 'maxSatisfying and prereleases', summary: 'Prereleases match only when a comparator opts in on the same major.minor.patch.' },
  ],
};
