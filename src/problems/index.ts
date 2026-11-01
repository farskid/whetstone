import type { Problem } from './types';
import { meta as f10Meta } from './f10-debounce-basic/meta';
import { tests as f10Tests } from './f10-debounce-basic/tests';
import { meta as a9Meta } from './a9-promise-all-settled/meta';
import { tests as a9Tests } from './a9-promise-all-settled/tests';
import { meta as a1Meta } from './a1-concurrency-limiter/meta';
import { tests as a1Tests } from './a1-concurrency-limiter/tests';
import { meta as a2Meta } from './a2-retry-backoff/meta';
import { tests as a2Tests } from './a2-retry-backoff/tests';
import { meta as a3Meta } from './a3-timeouts/meta';
import { tests as a3Tests } from './a3-timeouts/tests';
import { meta as a4Meta } from './a4-singleflight/meta';
import { tests as a4Tests } from './a4-singleflight/tests';
import { meta as a5Meta } from './a5-channels/meta';
import { tests as a5Tests } from './a5-channels/tests';
import { meta as a6Meta } from './a6-pmap/meta';
import { tests as a6Tests } from './a6-pmap/tests';
import { meta as a7Meta } from './a7-locks/meta';
import { tests as a7Tests } from './a7-locks/tests';
import { meta as a8Meta } from './a8-task-graph/meta';
import { tests as a8Tests } from './a8-task-graph/tests';
import { meta as b1Meta } from './b1-lru-ttl/meta';
import { tests as b1Tests } from './b1-lru-ttl/tests';
import { meta as b2Meta } from './b2-range-set/meta';
import { tests as b2Tests } from './b2-range-set/tests';
import { meta as b3Meta } from './b3-indexed-pq/meta';
import { tests as b3Tests } from './b3-indexed-pq/tests';
import { meta as b4Meta } from './b4-rolling-metrics/meta';
import { tests as b4Tests } from './b4-rolling-metrics/tests';
import { meta as b5Meta } from './b5-sorted-set/meta';
import { tests as b5Tests } from './b5-sorted-set/tests';
import { meta as b6Meta } from './b6-piece-table/meta';
import { tests as b6Tests } from './b6-piece-table/tests';
import { meta as b7Meta } from './b7-memoization/meta';
import { tests as b7Tests } from './b7-memoization/tests';
import { meta as b8Meta } from './b8-indexed-table/meta';
import { tests as b8Tests } from './b8-indexed-table/tests';
import { meta as c1Meta } from './c1-express-router/meta';
import { tests as c1Tests } from './c1-express-router/tests';
import { meta as c2Meta } from './c2-hook-system/meta';
import { tests as c2Tests } from './c2-hook-system/tests';
import { meta as c3Meta } from './c3-http-interceptors/meta';
import { tests as c3Tests } from './c3-http-interceptors/tests';
import { meta as c4Meta } from './c4-event-emitter/meta';
import { tests as c4Tests } from './c4-event-emitter/tests';
import { meta as c5Meta } from './c5-di-container/meta';
import { tests as c5Tests } from './c5-di-container/tests';
import { meta as c6Meta } from './c6-loader-chain/meta';
import { tests as c6Tests } from './c6-loader-chain/tests';
import { meta as c7Meta } from './c7-structured-logger/meta';
import { tests as c7Tests } from './c7-structured-logger/tests';
import { meta as c8Meta } from './c8-mini-bundler/meta';
import { tests as c8Tests } from './c8-mini-bundler/tests';
import { meta as d1Meta } from './d1-cli-args/meta';
import { tests as d1Tests } from './d1-cli-args/tests';
import { meta as d2Meta } from './d2-semver/meta';
import { tests as d2Tests } from './d2-semver/tests';
import { meta as d3Meta } from './d3-cron/meta';
import { tests as d3Tests } from './d3-cron/tests';
import { meta as d4Meta } from './d4-template-engine/meta';
import { tests as d4Tests } from './d4-template-engine/tests';
import { meta as d5Meta } from './d5-markdown-lite/meta';
import { tests as d5Tests } from './d5-markdown-lite/tests';
import { meta as d6Meta } from './d6-route-matching/meta';
import { tests as d6Tests } from './d6-route-matching/tests';
import { meta as d7Meta } from './d7-object-path/meta';
import { tests as d7Tests } from './d7-object-path/tests';
import { meta as d8Meta } from './d8-spreadsheet/meta';
import { tests as d8Tests } from './d8-spreadsheet/tests';
import { meta as d9Meta } from './d9-csv-parser/meta';
import { tests as d9Tests } from './d9-csv-parser/tests';
import { meta as d10Meta } from './d10-query-string/meta';
import { tests as d10Tests } from './d10-query-string/tests';
import { meta as d11Meta } from './d11-env-parser/meta';
import { tests as d11Tests } from './d11-env-parser/tests';
import { meta as e1Meta } from './e1-redux-store/meta';
import { tests as e1Tests } from './e1-redux-store/tests';
import { meta as e2Meta } from './e2-signals/meta';
import { tests as e2Tests } from './e2-signals/tests';
import { meta as e3Meta } from './e3-immutable-produce/meta';
import { tests as e3Tests } from './e3-immutable-produce/tests';
import { meta as e4Meta } from './e4-undo-redo/meta';
import { tests as e4Tests } from './e4-undo-redo/tests';
import { meta as e5Meta } from './e5-state-machine/meta';
import { tests as e5Tests } from './e5-state-machine/tests';
import { meta as e6Meta } from './e6-query-cache/meta';
import { tests as e6Tests } from './e6-query-cache/tests';
import { meta as e7Meta } from './e7-form-state/meta';
import { tests as e7Tests } from './e7-form-state/tests';
import { meta as e8Meta } from './e8-tiny-store/meta';
import { tests as e8Tests } from './e8-tiny-store/tests';
import { meta as f1Meta } from './f1-debounce/meta';
import { tests as f1Tests } from './f1-debounce/tests';
import { meta as f2Meta } from './f2-deep-clone/meta';
import { tests as f2Tests } from './f2-deep-clone/tests';
import { meta as f3Meta } from './f3-deep-diff/meta';
import { tests as f3Tests } from './f3-deep-diff/tests';
import { meta as f4Meta } from './f4-text-diff/meta';
import { tests as f4Tests } from './f4-text-diff/tests';
import { meta as f5Meta } from './f5-fuzzy-search/meta';
import { tests as f5Tests } from './f5-fuzzy-search/tests';
import { meta as f6Meta } from './f6-schema-validation/meta';
import { tests as f6Tests } from './f6-schema-validation/tests';
import { meta as g1Meta } from './g1-virtual-list/meta';
import { tests as g1Tests } from './g1-virtual-list/tests';
import { meta as h6Meta } from './h6-offline-queue/meta';
import { tests as h6Tests } from './h6-offline-queue/tests';

/** Every problem in display order: Easy warm-ups first, then catalog order. Generated by scripts/gen-index.py. */
export const problems: Problem[] = [
  { ...f10Meta, tests: f10Tests },
  { ...a9Meta, tests: a9Tests },
  { ...a1Meta, tests: a1Tests },
  { ...a2Meta, tests: a2Tests },
  { ...a3Meta, tests: a3Tests },
  { ...a4Meta, tests: a4Tests },
  { ...a5Meta, tests: a5Tests },
  { ...a6Meta, tests: a6Tests },
  { ...a7Meta, tests: a7Tests },
  { ...a8Meta, tests: a8Tests },
  { ...b1Meta, tests: b1Tests },
  { ...b2Meta, tests: b2Tests },
  { ...b3Meta, tests: b3Tests },
  { ...b4Meta, tests: b4Tests },
  { ...b5Meta, tests: b5Tests },
  { ...b6Meta, tests: b6Tests },
  { ...b7Meta, tests: b7Tests },
  { ...b8Meta, tests: b8Tests },
  { ...c1Meta, tests: c1Tests },
  { ...c2Meta, tests: c2Tests },
  { ...c3Meta, tests: c3Tests },
  { ...c4Meta, tests: c4Tests },
  { ...c5Meta, tests: c5Tests },
  { ...c6Meta, tests: c6Tests },
  { ...c7Meta, tests: c7Tests },
  { ...c8Meta, tests: c8Tests },
  { ...d1Meta, tests: d1Tests },
  { ...d2Meta, tests: d2Tests },
  { ...d3Meta, tests: d3Tests },
  { ...d4Meta, tests: d4Tests },
  { ...d5Meta, tests: d5Tests },
  { ...d6Meta, tests: d6Tests },
  { ...d7Meta, tests: d7Tests },
  { ...d8Meta, tests: d8Tests },
  { ...d9Meta, tests: d9Tests },
  { ...d10Meta, tests: d10Tests },
  { ...d11Meta, tests: d11Tests },
  { ...e1Meta, tests: e1Tests },
  { ...e2Meta, tests: e2Tests },
  { ...e3Meta, tests: e3Tests },
  { ...e4Meta, tests: e4Tests },
  { ...e5Meta, tests: e5Tests },
  { ...e6Meta, tests: e6Tests },
  { ...e7Meta, tests: e7Tests },
  { ...e8Meta, tests: e8Tests },
  { ...f1Meta, tests: f1Tests },
  { ...f2Meta, tests: f2Tests },
  { ...f3Meta, tests: f3Tests },
  { ...f4Meta, tests: f4Tests },
  { ...f5Meta, tests: f5Tests },
  { ...f6Meta, tests: f6Tests },
  { ...g1Meta, tests: g1Tests },
  { ...h6Meta, tests: h6Tests },
];

export const problemsById = new Map(problems.map((p) => [p.id, p]));
