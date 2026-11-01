import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f3-deep-diff',
  catalogId: 'F3',
  title: 'Deep diff & patch',
  theme: 'Utilities',
  difficulty: 'Hard',
  inspiredBy: 'jsondiffpatch, fast-json-patch',
  tags: [
    { kind: 'library', name: 'jsondiffpatch' },
    { kind: 'library', name: 'fast-json-patch' },
    { kind: 'pattern', name: 'Deep equality' },
    { kind: 'pattern', name: 'JSON Patch (RFC 6902)' },
  ],
  summary: 'Deep equality, a JSON Patch (RFC 6902) diff with pointer escaping and hash-based array moves, and an atomic, immutable applyPatch.',
  stages: [
    { title: 'Equality', summary: 'SameValueZero, Dates, key order, undefined vs missing.' },
    { title: 'Diff', summary: 'RFC 6902 ops with ~0/~1 escaping; arrays by index.' },
    { title: 'Apply', summary: 'add/remove/replace/move/copy/test, immutable and atomic.' },
    { title: 'Moves', summary: 'objectHash turns reorders into move ops; round-trip property test.' },
  ],
};
