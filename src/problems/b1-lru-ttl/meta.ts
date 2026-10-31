import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b1-lru-ttl',
  catalogId: 'B1',
  title: 'LRU cache with TTL',
  theme: 'Data/Caches',
  difficulty: 'Medium',
  inspiredBy: 'lru-cache (isaacs)',
  summary: 'O(1) LRU with per-entry TTL, eviction callbacks with reasons, and size-based limits.',
  stages: [
    { title: 'Bounded LRU', summary: 'get/set/has/peek/delete with least-recently-used eviction at max entries.' },
    { title: 'TTL', summary: 'Default and per-entry ttl on an injected clock; expired entries are invisible.' },
    { title: 'Eviction callbacks', summary: 'onEvict(key, value, reason) for evict, expire, delete and overwrite.' },
    { title: 'Size-based limits', summary: 'maxSize + sizeOf: evict until the total fits; refuse items that never fit.' },
  ],
};
