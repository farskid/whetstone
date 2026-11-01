import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd6-route-matching',
  catalogId: 'D6',
  title: 'Route matching',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'find-my-way, path-to-regexp, React Router',
  tags: [
    { kind: 'library', name: 'find-my-way' },
    { kind: 'library', name: 'path-to-regexp' },
    { kind: 'library', name: 'React Router' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Routing' },
    { kind: 'pattern', name: 'Reverse routing' },
  ],
  summary: 'A router with params, optional segments, constraints, wildcards, specificity ranking, 405s and reverse routing.',
  stages: [
    { title: 'Static and params', summary: 'add(method, "/users/:id") and match(method, path) with decoded params.' },
    { title: 'Specificity', summary: 'Static beats param beats wildcard, per segment, regardless of registration order.' },
    { title: 'Optional, constraints, wildcard', summary: ':id?, :id(\\d+) and trailing * with backtracking.' },
    { title: 'Methods and reverse routing', summary: 'ALL, allowedMethods() for 405s, duplicate detection and buildPath().' },
  ],
};
