import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g1-virtual-list',
  catalogId: 'G1',
  title: 'Virtual list',
  theme: 'Browser/UI',
  difficulty: 'Hard',
  inspiredBy: 'TanStack Virtual, react-window',
  tags: [
    { kind: 'library', name: 'TanStack Virtual' },
    { kind: 'library', name: 'react-window' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Virtualization' },
    { kind: 'pattern', name: 'Scroll anchoring' },
  ],
  summary: 'The math behind list virtualization: visible range with overscan, dynamic measurement with scroll anchoring, scrollToIndex, 100k rows fast.',
  stages: [
    { title: 'Fixed size', summary: 'Visible range for a fixed row height, with overscan and total size.' },
    { title: 'Variable + measured sizes', summary: 'estimateSize per row, measure() replaces estimates, gap between rows.' },
    { title: 'Scroll anchoring + scrollToIndex', summary: 'measure() returns the scroll adjustment for rows above the viewport; scrollToIndex with start/center/end/auto.' },
    { title: 'Scale', summary: 'Count changes keep measurements; 100k rows with frequent measurements stay fast (no O(n) per call).' },
  ],
};
