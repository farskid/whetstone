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
    { title: 'Static and params', summary: 'add(method, "/users/:id") and match(method, path) with decoded params.', groups: ['Static and params'] },
    { title: 'Specificity and wildcards', summary: 'Static beats param beats trailing *, per segment, with backtracking from dead ends.', groups: ['Specificity and wildcards'] },
    { title: 'Constraints and optional params', summary: ':id(\\d+) segments that must fully match, and :id? params that may be absent.', groups: ['Constraints and optional params'] },
    { title: 'Methods and reverse routing', summary: 'ALL, allowedMethods() for 405s, duplicate detection and buildPath().', groups: ['Methods and reverse routing'] },
  ],
};
