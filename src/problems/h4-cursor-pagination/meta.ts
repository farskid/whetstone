import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'h4-cursor-pagination',
  catalogId: 'H4',
  title: 'Cursor pagination',
  theme: 'API/Network',
  difficulty: 'Medium',
  inspiredBy: 'Relay connections',
  summary: 'An async generator that walks cursor pages with dedupe, loop guards and resume, then a Relay-style feed that loads newer and older pages, evicts beyond a window, and applies live insert, update and delete events.',
  stages: [
    { title: 'Paging', summary: 'paginate(fetchPage) yields items until hasNextPage is false; break stops fetching.' },
    { title: 'Dedupe and guards', summary: 'Dedupe by id across pages, throw on a repeated cursor, and resume from .cursor after an error.' },
    { title: 'Bidirectional feed', summary: 'loadOlder / loadNewer over Relay edges, with maxItems eviction and shared in-flight loads.' },
    { title: 'Live updates', summary: 'Apply insert, update and delete events without refetching.' },
  ],
};
