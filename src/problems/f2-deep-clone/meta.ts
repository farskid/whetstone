import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f2-deep-clone',
  catalogId: 'F2',
  title: 'Deep clone',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'structuredClone, rfdc',
  summary: 'Deep-clone values with cycles, shared references, built-ins (Date, RegExp, Map, Set, typed arrays), sparse arrays, symbol keys and very deep nesting.',
  stages: [
    { title: 'Plain data', summary: 'Objects, arrays, primitives; functions and symbols throw.' },
    { title: 'Identity', summary: 'Cycles and shared references keep their shape.' },
    { title: 'Built-ins', summary: 'Date, RegExp, Map, Set, typed arrays and DataView.' },
    { title: 'Edges', summary: 'Sparse arrays, symbol keys, getters, prototypes, customizer, 100k depth.' },
  ],
};
