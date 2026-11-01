import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e7-form-state',
  catalogId: 'E7',
  title: 'Form state manager',
  theme: 'State',
  difficulty: 'Medium',
  inspiredBy: 'react-hook-form, Formik',
  summary: 'Nested form values with dirty/touched tracking, sync, debounced async and form-level validation, submit that waits for pending checks, and field arrays whose items keep stable ids.',
  stages: [
    { title: 'Values and dirty', summary: 'Nested get/set by path, dirty compared to the initial values, touched.' },
    { title: 'Validation', summary: 'Field and form validators with a fixed precedence.' },
    { title: 'Async validation and submit', summary: 'Debounced async checks, stale results dropped, submit awaits them.' },
    { title: 'Field arrays', summary: 'append/remove/move with stable ids that keep errors and touched state.' },
  ],
};
