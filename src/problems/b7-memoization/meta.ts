import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b7-memoization',
  catalogId: 'B7',
  title: 'Memoization family',
  theme: 'Data/Caches',
  difficulty: 'Medium',
  inspiredBy: 'memoize-one, reselect',
  summary: 'memoizeOne with custom equality and this-binding, a tuple-keyed memoize with LRU and WeakMap-held objects, and a reselect-style createSelector.',
  stages: [
    { title: 'memoizeOne', summary: 'Cache the last args and result with shallow arg equality.' },
    { title: 'Equality, this, throws', summary: 'Custom isEqual, keep the this binding, never cache a throw.' },
    { title: 'memoize with LRU', summary: 'Key by the argument tuple with nested Maps (no JSON.stringify); evict least recently used past max.' },
    { title: 'WeakMap and selectors', summary: 'Object args held weakly; createSelector recomputes only when inputs change.' },
  ],
};
