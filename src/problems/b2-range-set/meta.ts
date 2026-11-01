import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b2-range-set',
  catalogId: 'B2',
  title: 'Range set / availability',
  theme: 'Data/Caches',
  difficulty: 'Medium',
  inspiredBy: 'calendar free/busy',
  tags: [
    { kind: 'pattern', name: 'Interval set' },
    { kind: 'pattern', name: 'Free/busy scheduling' },
  ],
  summary: 'A set of half-open ranges that merges and splits, answers point and overlap queries in O(log n), and finds common free slots.',
  stages: [
    { title: 'Add and merge', summary: 'add([start, end)) merges overlapping and adjacent ranges; toArray() is sorted.' },
    { title: 'Remove and query', summary: 'remove splits ranges; contains(x) and overlaps([s, e)) run in O(log n).' },
    { title: 'Free slots', summary: 'freeSlots(window, minDuration) returns the gaps inside a window.' },
    { title: 'Common availability', summary: 'Common free slots of N people, each with busy ranges and working hours.' },
  ],
};
