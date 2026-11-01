import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'f8-date-math',
  catalogId: 'F8',
  title: 'Date math',
  theme: 'Utilities',
  difficulty: 'Medium',
  inspiredBy: 'date-fns, RFC 5545 RRULE',
  summary: 'Calendar arithmetic on plain dates, calendar-day differences in a time zone across DST, business days with holidays, and RRULE-lite recurrence expansion.',
  stages: [
    { title: 'Calendar arithmetic', summary: 'addDays, addMonths with end-of-month clamping, startOfWeek.' },
    { title: 'Time zones', summary: 'Calendar days of instants in a zone, across DST changes.' },
    { title: 'Business days', summary: 'Add and count business days with a holiday list.' },
    { title: 'Recurrence', summary: 'Daily, weekly and monthly rules with interval, nth weekday, count and until.' },
  ],
};
