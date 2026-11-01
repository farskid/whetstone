import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g2-keyboard-shortcuts',
  catalogId: 'G2',
  title: 'Keyboard shortcuts',
  theme: 'Browser/UI',
  difficulty: 'Medium',
  inspiredBy: 'tinykeys, hotkeys-js',
  summary: 'Parse and match key combos, then a binding manager with "g i" sequences, scopes, input filtering, platform-aware $mod and conflict detection.',
  stages: [
    { title: 'Parse and match', summary: 'parseCombo with modifier aliases; exact modifier matching against key events.' },
    { title: 'Sequences', summary: '"g i" style sequences with a timeout between keys on an injected clock.' },
    { title: 'Scopes and inputs', summary: 'The last pushed scope wins; events from text fields are ignored unless allowed.' },
    { title: 'Platforms and layouts', summary: '$mod, event.code vs event.key on non-US layouts, shifted punctuation and conflict detection.' },
  ],
};
