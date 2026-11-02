import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g7-history',
  catalogId: 'G7',
  title: 'Router history',
  theme: 'Browser/UI',
  difficulty: 'Medium',
  inspiredBy: 'history (createMemoryHistory), React Router',
  tags: [
    { kind: 'library', name: 'history' },
    { kind: 'library', name: 'React Router' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Session history' },
    { kind: 'pattern', name: 'Navigation blocking' },
  ],
  summary: 'An in-memory history stack with push, replace and clamped go, listeners, navigation blockers with retry and stale transitions, per-entry scroll positions and a capped stack.',
  stages: [
    { title: 'Locations', summary: 'Parse paths, resolve partial paths against the current location, createHref.', groups: ['Locations'] },
    { title: 'The stack', summary: 'push, replace, go/back/forward with clamping, unique keys, listeners.', groups: ['The stack'] },
    { title: 'Blocking', summary: 'Blockers stop navigation; retry approves and continues; new navigation makes old transitions stale.', groups: ['Blocking'] },
    { title: 'Scroll and limits', summary: 'Remember scroll per entry and drop the oldest entries past maxLength.', groups: ['Scroll and limits'] },
  ],
};
