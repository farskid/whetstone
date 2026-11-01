import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g4-roving-focus',
  catalogId: 'G4',
  title: 'Roving focus and typeahead',
  theme: 'Browser/UI',
  difficulty: 'Medium',
  inspiredBy: 'Radix UI, WAI-ARIA listbox and grid patterns',
  summary: 'Keyboard models for a listbox and a grid: arrows, Home/End and paging past disabled items, optional looping, Radix-style typeahead on an injected clock, ragged grids and RTL.',
  stages: [
    { title: 'Arrow keys', summary: 'ArrowUp/Down, Home and End move the active index.' },
    { title: 'Disabled items and looping', summary: 'Skip disabled items, an opt-in loop, PageUp/PageDown by a page.' },
    { title: 'Typeahead', summary: 'Characters within the timeout build a query; repeating a character cycles.' },
    { title: 'Grid', summary: 'Rows and columns with a ragged last row, and right-to-left arrows.' },
  ],
};
