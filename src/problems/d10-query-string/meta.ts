import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd10-query-string',
  catalogId: 'D10',
  title: 'Query string codec',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'qs',
  tags: [
    { kind: 'library', name: 'qs' },
    { kind: 'pattern', name: 'Query strings' },
    { kind: 'pattern', name: 'Prototype pollution protection' },
  ],
  summary: 'Parse and stringify query strings with repeated keys, nested brackets and arrays, plus depth, parameter and array-index limits and prototype-pollution protection.',
  stages: [
    { title: 'Flat pairs', summary: 'parse and stringify; repeated keys become arrays; + is a space.' },
    { title: 'Nesting', summary: 'a[b][c]=1, a[]=1, a[0]=x, round-tripping.' },
    { title: 'Security limits', summary: 'Depth, parameter count, array index cap and __proto__ blocking.' },
  ],
};
