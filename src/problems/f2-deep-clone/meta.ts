import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f2-deep-clone',
  catalogId: 'F2',
  title: 'Deep clone',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'structuredClone, rfdc',
  tags: [
    { kind: 'library', name: 'rfdc' },
    { kind: 'pattern', name: 'Deep clone' },
    { kind: 'pattern', name: 'structuredClone' },
  ],
  summary: 'Deep-clone values with cycles, shared references, built-ins (Date, RegExp, Map, Set, typed arrays), sparse arrays, symbol keys and very deep nesting.',
  stages: [
    { title: 'Plain data', summary: 'Objects, arrays, primitives; functions and symbols throw.', groups: ['Plain data'] },
    { title: 'Built-ins and identity', summary: 'Date, RegExp, Map, Set, typed arrays and DataView; cycles and shared references keep their shape.', groups: ['Built-ins and identity'] },
    { title: 'Edges', summary: 'Sparse arrays, symbol keys, getters, prototypes, customizer, 100k depth.', groups: ['Edges'] },
  ],
};
