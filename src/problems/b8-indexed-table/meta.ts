import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'b8-indexed-table',
  catalogId: 'B8',
  title: 'In-memory table with indexes',
  theme: 'Data/Caches',
  difficulty: 'Hard',
  inspiredBy: 'minimongo, Dexie',
  tags: [
    { kind: 'library', name: 'minimongo' },
    { kind: 'library', name: 'Dexie' },
    { kind: 'pattern', name: 'Secondary indexes' },
    { kind: 'pattern', name: 'Query planning' },
    { kind: 'pattern', name: 'Live queries' },
  ],
  summary: 'A row store with single, compound and unique indexes, range queries that pick the cheapest index, orderBy/limit, and live queries that fire only on real changes.',
  stages: [
    { title: 'CRUD', summary: 'insert, get, update(id, patch), remove, and where() by equality with a full scan.', groups: ['CRUD'] },
    { title: 'Indexed lookups', summary: 'createIndex(field); where({ field: value }) reads only the matching index entries.', groups: ['Indexed lookups'] },
    { title: 'Ranges, compound, ordering', summary: '$gt/$gte/$lt/$lte, compound and unique indexes, orderBy and limit.', groups: ['Ranges, compound, ordering'] },
    { title: 'Live queries', summary: 'subscribe(query, cb) fires only when the result actually changes.', groups: ['Live queries'] },
  ],
};
