import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b3-indexed-pq',
  catalogId: 'B3',
  title: 'Indexed priority queue',
  theme: 'Data/Caches',
  difficulty: 'Medium',
  inspiredBy: 'scheduler heaps',
  tags: [
    { kind: 'pattern', name: 'Priority queue' },
    { kind: 'pattern', name: 'Binary heap' },
    { kind: 'pattern', name: 'Timer scheduler' },
  ],
  summary: 'A binary heap with ids, O(log n) update/remove, FIFO ties, and a virtual-clock timer scheduler on top.',
  stages: [
    { title: 'Binary heap', summary: 'push/pop/peek/size with a comparator.' },
    { title: 'Ids, update and remove', summary: 'Items have ids; update(id, priority) and remove(id) in O(log n).' },
    { title: 'Stable ties', summary: 'Equal priorities come out in push order (FIFO).' },
    { title: 'Virtual timers', summary: 'setTimeout/clearTimeout on a virtual clock with advance(ms), including timers added by callbacks.' },
  ],
};
