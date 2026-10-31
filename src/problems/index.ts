import type { Problem } from './types';
import { meta as a8Meta } from './a8-task-graph/meta';
import { tests as a8Tests } from './a8-task-graph/tests';
import { meta as b1Meta } from './b1-lru-ttl/meta';
import { tests as b1Tests } from './b1-lru-ttl/tests';
import { meta as d6Meta } from './d6-route-matching/meta';
import { tests as d6Tests } from './d6-route-matching/tests';
import { meta as e2Meta } from './e2-signals/meta';
import { tests as e2Tests } from './e2-signals/tests';
import { meta as a1Meta } from './a1-concurrency-limiter/meta';
import { tests as a1Tests } from './a1-concurrency-limiter/tests';

/** Every problem in display order. To add one, see README "Adding a problem". */
export const problems: Problem[] = [
  { ...a1Meta, tests: a1Tests },
  { ...a8Meta, tests: a8Tests },
  { ...b1Meta, tests: b1Tests },
  { ...d6Meta, tests: d6Tests },
  { ...e2Meta, tests: e2Tests },
];

export const problemsById = new Map(problems.map((p) => [p.id, p]));
