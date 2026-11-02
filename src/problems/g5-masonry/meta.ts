import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g5-masonry',
  catalogId: 'G5',
  title: 'Masonry layout',
  theme: 'Browser/UI',
  difficulty: 'Medium',
  inspiredBy: 'Masonry, Pinterest-style grids, react-masonry-css',
  tags: [
    { kind: 'library', name: 'Masonry' },
    { kind: 'library', name: 'react-masonry-css' },
    { kind: 'framework', name: 'React' },
    { kind: 'company', name: 'Pinterest' },
    { kind: 'pattern', name: 'Masonry layout' },
  ],
  summary: 'Place cards into the shortest column with gutters, derive columns from a minimum width, handle multi-column spans and aspect ratios, and append or resize incrementally.',
  stages: [
    { title: 'Shortest column', summary: 'Fixed column count, gutters, leftmost column on ties, total height.', groups: ['Shortest column'] },
    { title: 'Responsive columns', summary: 'Column count from a minimum width; heights from aspect ratios.', groups: ['Responsive columns'] },
    { title: 'Spans', summary: 'Items that span several columns land on the lowest run of adjacent columns.', groups: ['Spans'] },
    { title: 'Incremental', summary: 'Append without moving placed items; resize lays everything out again.', groups: ['Incremental'] },
  ],
};
