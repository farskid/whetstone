import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd3-cron',
  catalogId: 'D3',
  title: 'Cron next-run',
  theme: 'Parsing',
  difficulty: 'Hard',
  inspiredBy: 'cron-parser',
  tags: [
    { kind: 'library', name: 'cron-parser' },
    { kind: 'pattern', name: 'Cron expressions' },
    { kind: 'pattern', name: 'Time zones and DST' },
  ],
  summary: 'Parse 5-field cron expressions and compute the next and previous run, with day-of-month OR day-of-week semantics, impossible schedules, and time zones across DST gaps and overlaps.',
  stages: [
    { title: 'Parse fields', summary: '*, numbers and lists into sorted sets.', groups: ['Parse fields'] },
    { title: 'Ranges, steps, names', summary: '1-30/5, */15, JAN-MAR, MON-FRI, 7 = Sunday.', groups: ['Ranges, steps, names'] },
    { title: 'next() in UTC', summary: 'Next matching minute; DOM OR DOW when both are restricted; impossible schedules return null.', groups: ['next() in UTC'] },
    { title: 'Time zones and prev()', summary: 'Skipped local times never fire; repeated ones fire once; search backwards too.', groups: ['Time zones and prev()'] },
  ],
};
