import type { Problem } from './types';
import { meta as a9Meta } from './a9-promise-all-settled/meta';
import { tests as a9Tests } from './a9-promise-all-settled/tests';
import { meta as f10Meta } from './f10-debounce-basic/meta';
import { tests as f10Tests } from './f10-debounce-basic/tests';
import { meta as f1Meta } from './f1-debounce/meta';
import { tests as f1Tests } from './f1-debounce/tests';
import { meta as a8Meta } from './a8-task-graph/meta';
import { tests as a8Tests } from './a8-task-graph/tests';
import { meta as b1Meta } from './b1-lru-ttl/meta';
import { tests as b1Tests } from './b1-lru-ttl/tests';
import { meta as d6Meta } from './d6-route-matching/meta';
import { tests as d6Tests } from './d6-route-matching/tests';
import { meta as e6Meta } from './e6-query-cache/meta';
import { tests as e6Tests } from './e6-query-cache/tests';
import { meta as e2Meta } from './e2-signals/meta';
import { tests as e2Tests } from './e2-signals/tests';
import { meta as a1Meta } from './a1-concurrency-limiter/meta';
import { tests as a1Tests } from './a1-concurrency-limiter/tests';
import { meta as g1Meta } from './g1-virtual-list/meta';
import { tests as g1Tests } from './g1-virtual-list/tests';
import { meta as c3Meta } from './c3-http-interceptors/meta';
import { tests as c3Tests } from './c3-http-interceptors/tests';
import { meta as h6Meta } from './h6-offline-queue/meta';
import { tests as h6Tests } from './h6-offline-queue/tests';
import { meta as f6Meta } from './f6-schema-validation/meta';
import { tests as f6Tests } from './f6-schema-validation/tests';

/** Every problem in display order. To add one, see README "Adding a problem". */
export const problems: Problem[] = [
  // Easy warm-ups first.
  { ...f10Meta, tests: f10Tests },
  { ...a9Meta, tests: a9Tests },
  { ...a1Meta, tests: a1Tests },
  { ...a8Meta, tests: a8Tests },
  { ...b1Meta, tests: b1Tests },
  { ...c3Meta, tests: c3Tests },
  { ...d6Meta, tests: d6Tests },
  { ...e2Meta, tests: e2Tests },
  { ...e6Meta, tests: e6Tests },
  { ...f1Meta, tests: f1Tests },
  { ...f6Meta, tests: f6Tests },
  { ...g1Meta, tests: g1Tests },
  { ...h6Meta, tests: h6Tests },
];

export const problemsById = new Map(problems.map((p) => [p.id, p]));
