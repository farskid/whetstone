import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b5-sorted-set',
  catalogId: 'B5',
  title: 'Sorted set / leaderboard',
  theme: 'Data/Caches',
  difficulty: 'Medium',
  inspiredBy: 'Redis ZSET',
  tags: [
    { kind: 'library', name: 'Redis' },
    { kind: 'pattern', name: 'Sorted set' },
    { kind: 'pattern', name: 'Leaderboard' },
  ],
  summary: 'A Redis-style sorted set: ranks, score and rank ranges with exclusive bounds, increments, dense ranks and "me ± k" paging, all O(log n).',
  stages: [
    { title: 'Add, score, rank', summary: 'add(member, score), score(member), rank(member) with 0 = lowest.', groups: ['Add, score, rank'] },
    { title: 'Ranges', summary: 'rangeByScore(min, max) with exclusive and infinite bounds, rangeByRank(start, stop) with negative indices and rev.', groups: ['Ranges'] },
    { title: 'Leaderboard', summary: 'incrBy, and revRank as the exact reverse of the ascending order.', groups: ['Leaderboard'] },
    { title: 'Dense rank and paging', summary: 'Ties share a dense rank; page around a member ("me ± k").', groups: ['Dense rank and paging', 'Performance'] },
  ],
};
