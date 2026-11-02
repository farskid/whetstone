import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g2-keyboard-shortcuts',
  catalogId: 'G2',
  title: 'Keyboard shortcuts',
  theme: 'Browser/UI',
  difficulty: 'Medium',
  inspiredBy: 'tinykeys, hotkeys-js',
  tags: [
    { kind: 'library', name: 'tinykeys' },
    { kind: 'library', name: 'hotkeys-js' },
    { kind: 'pattern', name: 'Keyboard shortcuts' },
    { kind: 'pattern', name: 'Key sequences' },
  ],
  summary: 'Parse and match key combos, then a binding manager with "g i" sequences, scopes, input filtering, platform-aware $mod and conflict detection.',
  stages: [
    { title: 'Parse and match', summary: 'parseCombo with aliases and $mod, normalize, exact modifier matching and shifted punctuation.', groups: ['Parse and match'] },
    { title: 'Sequences', summary: '"g i" style sequences with a timeout between keys on an injected clock.', groups: ['Sequences'] },
    { title: 'Scopes and inputs', summary: 'The last pushed scope wins; events from text fields are ignored unless allowed.', groups: ['Scopes and inputs'] },
    { title: 'Platforms and layouts', summary: 'event.code vs event.key on non-US layouts, and conflict detection.', groups: ['Platforms and layouts'] },
  ],
};
