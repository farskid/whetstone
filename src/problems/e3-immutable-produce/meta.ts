import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e3-immutable-produce',
  catalogId: 'E3',
  title: 'Immutable produce',
  theme: 'State',
  difficulty: 'Hard',
  inspiredBy: 'Immer',
  tags: [
    { kind: 'library', name: 'Immer' },
    { kind: 'pattern', name: 'Copy-on-write' },
    { kind: 'pattern', name: 'Structural sharing' },
    { kind: 'pattern', name: 'Proxies' },
    { kind: 'pattern', name: 'Patches' },
  ],
  summary: 'Write produce(base, recipe) with Proxy drafts: copy-on-write with structural sharing, arrays, Map and Set, frozen output, revoked drafts, and patches with inverses.',
  stages: [
    { title: 'Drafts and copy-on-write', summary: 'produce over nested objects and arrays; the base is never touched; no-op edits return the base.', groups: ['Drafts and copy-on-write'] },
    { title: 'Sharing, freezing and revoking', summary: 'Untouched subtrees stay ===; output is frozen; drafts are revoked; moved drafts are finalized.', groups: ['Sharing, freezing and revoking'] },
    { title: 'Arrays, Map, Set, return values', summary: 'push/splice, Map and Set drafts, returning a new value or nothing.', groups: ['Arrays, Map, Set, return values'] },
    { title: 'Patches', summary: 'produceWithPatches with inverse patches, and applyPatches.', groups: ['Patches'] },
  ],
};
