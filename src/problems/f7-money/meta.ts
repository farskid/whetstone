import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f7-money',
  catalogId: 'F7',
  title: 'Money math',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'dinero.js',
  tags: [
    { kind: 'library', name: 'dinero.js' },
    { kind: 'pattern', name: 'Money' },
    { kind: 'pattern', name: 'Value object' },
    { kind: 'pattern', name: 'Rounding modes' },
    { kind: 'pattern', name: 'Intl formatting' },
  ],
  summary: 'An immutable Money type in integer minor units: exact arithmetic, allocation without lost cents, multiplication with rounding modes, currency conversion and Intl formatting.',
  stages: [
    { title: 'Value object', summary: 'Integer minor units, add and subtract; mixing currencies throws.' },
    { title: 'Allocation', summary: 'Split by ratios with no lost cents.' },
    { title: 'Multiply and round', summary: 'Half-even, half-up, floor and ceil; 0- and 3-decimal currencies.' },
    { title: 'Convert and format', summary: 'Rates between currencies and locale formatting via Intl.' },
  ],
};
