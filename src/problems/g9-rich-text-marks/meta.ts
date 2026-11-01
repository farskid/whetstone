import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'g9-rich-text-marks',
  catalogId: 'G9',
  title: 'Rich-text marks',
  theme: 'Browser/UI',
  difficulty: 'Hard',
  inspiredBy: 'ProseMirror, Slate',
  tags: [
    { kind: 'library', name: 'ProseMirror' },
    { kind: 'library', name: 'Slate' },
    { kind: 'pattern', name: 'Rich text' },
    { kind: 'pattern', name: 'Normalization' },
    { kind: 'pattern', name: 'HTML serialization' },
  ],
  summary: 'A text model of marked spans: add, remove and toggle marks over ranges with normalization, typing that inherits marks (with non-inclusive links and stored marks), marks with attributes, and HTML serialization that round-trips.',
  stages: [
    { title: 'Spans and marks', summary: 'Text as spans with marks; addMark splits spans as needed.' },
    { title: 'Toggle and normalize', summary: 'toggleMark over a range, and merging adjacent spans with equal marks.' },
    { title: 'Typing', summary: 'insertText inherits marks at the cursor, links are not inclusive, and a collapsed toggle sets stored marks.' },
    { title: 'Attributes and HTML', summary: 'Link and color marks with attributes, plus HTML output with correct nesting and a parser that round-trips.' },
  ],
};
