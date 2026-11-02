import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g3-sortable-dnd',
  catalogId: 'G3',
  title: 'Sortable drag-and-drop',
  theme: 'Browser/UI',
  difficulty: 'Hard',
  inspiredBy: 'dnd-kit sortable and tree examples',
  tags: [
    { kind: 'library', name: 'dnd-kit' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Drag and drop' },
    { kind: 'pattern', name: 'Sortable lists' },
    { kind: 'pattern', name: 'Tree projection' },
  ],
  summary: 'The math behind sortable lists and trees: non-mutating moves, midpoint drop index, multi-select drags, and tree depth projection from the drag offset with descendant protection.',
  stages: [
    { title: 'arrayMove and drop index', summary: 'Move one item without mutating the list; midpoint rule against the other items\' rects.', groups: ['arrayMove', 'Drop index'] },
    { title: 'Multi-select', summary: 'Move non-contiguous selections as one block, keeping their order.', groups: ['Multi-select'] },
    { title: 'Trees', summary: 'Project depth and parent from the horizontal offset; never into a descendant; max depth.', groups: ['Trees'] },
  ],
};
