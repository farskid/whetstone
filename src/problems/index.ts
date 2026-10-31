import type { Problem } from './types';
import { meta as e2Meta } from './e2-signals/meta';
import { tests as e2Tests } from './e2-signals/tests';

/** Every problem in display order. To add one, see README "Adding a problem". */
export const problems: Problem[] = [
  { ...e2Meta, tests: e2Tests },
];

export const problemsById = new Map(problems.map((p) => [p.id, p]));
