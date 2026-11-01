import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f9-humanize',
  catalogId: 'F9',
  title: 'Humanize bytes and durations',
  theme: 'Utilities',
  difficulty: 'Easy',
  inspiredBy: 'pretty-bytes, ms',
  summary: 'Format byte counts with SI or binary units, parse and format durations like "2h 30m", and phrase relative times with Intl.',
  stages: [
    { title: 'Bytes', summary: 'SI and binary units, rounding that carries into the next unit.' },
    { title: 'Parse durations', summary: '"2h 30m", "1.5h", long unit names, strict errors.' },
    { title: 'Format durations', summary: 'Compact and long forms, negatives.' },
    { title: 'Relative time', summary: 'Pick the unit by threshold and format with Intl.RelativeTimeFormat.' },
  ],
};
