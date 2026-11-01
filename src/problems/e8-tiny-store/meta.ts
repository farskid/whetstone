import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e8-tiny-store',
  catalogId: 'E8',
  title: 'Tiny store + persist',
  theme: 'State',
  difficulty: 'Medium',
  inspiredBy: 'Zustand',
  tags: [
    { kind: 'library', name: 'Zustand' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Store' },
    { kind: 'pattern', name: 'Selectors' },
    { kind: 'pattern', name: 'Persistence' },
    { kind: 'pattern', name: 'Migrations' },
  ],
  summary: 'A minimal store with selector subscriptions, plus a persist middleware with async hydration, versions and migrations, partialize, corrupt-storage fallback and cross-tab sync.',
  stages: [
    { title: 'Store', summary: 'create(set/get), merge or replace, subscribe(state, prev).' },
    { title: 'Selectors', summary: 'Selector subscriptions with equality and fireImmediately.' },
    { title: 'Persist', summary: 'Async hydration, partialize, versions and migrate, corrupt-storage fallback.' },
    { title: 'Races and tabs', summary: 'Writes before hydration win; cross-tab sync without echo.' },
  ],
};
