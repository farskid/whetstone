import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e7-form-state',
  catalogId: 'E7',
  title: 'Form state manager',
  theme: 'State',
  difficulty: 'Medium',
  inspiredBy: 'react-hook-form, Formik',
  tags: [
    { kind: 'library', name: 'react-hook-form' },
    { kind: 'library', name: 'Formik' },
    { kind: 'framework', name: 'React' },
    { kind: 'pattern', name: 'Form state' },
    { kind: 'pattern', name: 'Validation' },
  ],
  summary: 'Nested form values with dirty/touched tracking, sync, debounced async and form-level validation, submit that waits for pending checks, and field arrays whose items keep stable ids.',
  stages: [
    { title: 'Values and dirty', summary: 'Nested get/set by path, dirty compared to the initial values, touched.', groups: ['Values and dirty'] },
    { title: 'Validation', summary: 'Field, async and form validators with a fixed precedence; stale results dropped.', groups: ['Validation'] },
    { title: 'Debounce and submit', summary: 'Async checks debounced on a clock, isValidating, and submit that awaits them.', groups: ['Debounce and submit'] },
    { title: 'Field arrays', summary: 'append/remove/move with stable ids that keep errors and touched state.', groups: ['Field arrays'] },
  ],
};
