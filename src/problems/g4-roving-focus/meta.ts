import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g4-roving-focus',
  catalogId: 'G4',
  title: 'Roving focus and typeahead',
  theme: 'Browser/UI',
  difficulty: 'Medium',
  inspiredBy: 'Radix UI, WAI-ARIA listbox and grid patterns',
  tags: [
    { kind: 'library', name: 'Radix UI' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Roving focus' },
    { kind: 'pattern', name: 'Typeahead' },
    { kind: 'pattern', name: 'WAI-ARIA' },
  ],
  summary: 'Keyboard models for a listbox and a grid: arrows, Home/End and paging past disabled items, optional looping, Radix-style typeahead on an injected clock, ragged grids and RTL.',
  stages: [
    { title: 'Navigation', summary: 'Arrows, Home and End; skip disabled items, an opt-in loop, PageUp/PageDown by a page.', groups: ['Arrow keys', 'Disabled items and looping'] },
    { title: 'Typeahead', summary: 'Characters within the timeout build a query; repeating a character cycles.', groups: ['Typeahead'] },
    { title: 'Grid', summary: 'Rows and columns with a ragged last row, and right-to-left arrows.', groups: ['Grid'] },
  ],
};
