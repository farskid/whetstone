# Whetstone: library-style coding practice

Whetstone is a static site of practical coding problems. You rebuild the core of libraries you use every day: concurrency limiters, retries, channels, caches, sorted sets, text buffers, interceptors, routers, signals, query caches, schema validators, virtual lists and offline queues. The problems come from `practical-problems-catalog.md` (70 problems in eight themes, A to H).

You write TypeScript or JavaScript in Monaco, which gives you full types and autocomplete. A real test suite runs in a Web Worker in your browser. There is no backend.

## Run it

```bash
npm install
npm run dev              # dev server with hot reload (http://localhost:5173)
npm run build            # tsc --noEmit + vite build → dist/ (static, hash routing; host anywhere)
npm run build:pages      # same, with base /whetstone/ for GitHub Pages
npm run preview          # serve dist/ locally
npm run verify           # Node: every reference solution passes, the starter fails, every broken/ solution fails ≥1 test; plus the stage checks
npm run verify:browser   # after build: every reference solution (TS and JS) passes in the real browser worker, staged ones per stage too, plus a clicked-through stage 1 → 2 flow
VERIFY_BASE=/whetstone/ npm run verify:browser   # after build:pages: the same, served under /whetstone/
npm run screenshots      # after build: writes screenshots/*.png (needs Chrome; set CHROME_PATH if not /usr/bin/google-chrome)
npm run verify -- e2-signals   # verify only one problem
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` publishes the site to https://farskid.github.io/whetstone/ on every push to `main`, and on demand from the Actions tab (`workflow_dispatch`). It runs `npm ci` and `npm run build` with `BASE_PATH=/whetstone/` on Node 22, uploads `dist/` with `upload-pages-artifact`, and publishes it with `deploy-pages`.

One-time setup: in the repo, go to Settings → Pages → Build and deployment and set Source to **GitHub Actions**.

- **Base path**: `vite.config.ts` uses `BASE_PATH` for builds, or `./` when it isn't set, so a plain `npm run build` still works from any folder. The dev server always runs at `/`. Monaco's workers, the test-runner worker and every asset follow the base.
- **Refresh**: routes live in the hash (`#/p/<id>`, `#/?tag=<name>`), so reloading any page loads `index.html`. The build also writes `dist/404.html` (a copy of `index.html`), so a mistyped path under `/whetstone/` opens the app instead of GitHub's 404 page.
- **Check locally**: `npm run build:pages && VERIFY_BASE=/whetstone/ npm run verify:browser -- <id> <id>`. This serves `dist/` with `vite preview --base /whetstone/` and fails on any request that 404s. To browse it yourself, run `npx vite preview --base /whetstone/` and open http://localhost:4173/whetstone/.

## How it works

- **List** (`#/`) shows search, difficulty, theme and status filters, a solved marker, a progress count, and JSON export and import of progress.
- **Tags**: every problem carries small tag chips for the libraries, frameworks, companies and patterns it relates to. Click a chip, or open "Browse by…" above the list, to filter the list to that tag (`#/?tag=<name>`); click it again or "Clear" to drop the filter. Search also matches tag names. The problem page shows the same chips above the statement.
- **Problem** (`#/p/<id>`) has the following parts:
  - A markdown statement.
  - A Monaco editor with a TS/JS toggle. Each language keeps its own code, and the starter's types power autocomplete.
  - Reset, and Run as often as you like with Ctrl/⌘+Enter.
  - The test list is visible before you run anything. When a test fails, it shows the input, expected value, actual value, the error with a line in your code, and console output.
  - The solution tab unlocks once you have solved the problem, or after you confirm.
  - **Staged problems** (F1, A1 to A4, B1, E1, H1) show a stage bar. Stage 1 starts with a small starter and statement. Each run runs that stage's tests plus every earlier stage's tests. Passing a stage saves a snapshot of your code and unlocks the next stage: a "Stage N cleared" banner plays and its "Go to stage N+1" button moves you on (nothing moves until you click it; "Stay on stage N" leaves the button in a bar above the tests). Passing the whole problem plays a short "Cracked" effect instead. Your editor buffer carries over, and "Restart stage" goes back to the snapshot. The editor shows two files side by side: a read-only `types.ts` with the stage's types on the left (each stage replaces it and highlights what it added), and your `solution.ts` on the right, which imports them with `import type { … } from './types'`. A narrow editor area stacks them. The divider between the two files drags (or moves with the arrow keys when focused) and the size is kept per layout in `localStorage` under `practical:layout`. Code saved before the types had their own file still runs; the editor offers to swap its own copies of the types for the import (Ctrl/⌘+Z undoes it), or to keep them. Each stage has its own reference solution, revealed separately. The final stage runs every test, and passing it solves the problem. The "Full problem" toggle skips the stages: it shows the whole statement and runs everything at once. The list shows a stage pill (for example "1/3 stages") on staged rows.
- **Runner** (`src/runner/`):
  - Sucrase strips the types from your code. The code is then loaded as an ES module inside a Web Worker. A 5s watchdog kills the worker on infinite loops.
  - Time-based problems use a `FakeClock` passed into your code, so the tests are deterministic.
  - The same core runs under Node for `npm run verify`.
- **Persistence**: everything is kept in `localStorage` under `practical:v2`. This covers code per problem and language, solved state, attempts, theme (Dark, Light or System, which follows the OS live) and language, plus for staged problems the unlocked stage, when each stage passed, the code snapshot per passed stage, revealed stage references and the full-problem toggle. On first load, `practical:v1` progress (and old v1 exports on import) is migrated:
  - A problem solved in v1 counts as fully passed, with every stage unlocked.
  - Progress on the old F10 warm-up counts towards F1 stage 1.
  - `#/p/f10-debounce-basic` redirects to F1.
  - The v1 key is left in place.

## Add a problem

1. Create `src/problems/<id>/`, where `<id>` is the URL slug (for example `x1-thing`), with these files:
   - `meta.ts`: `export const meta: ProblemMeta = { id, catalogId, title, theme, difficulty, inspiredBy, tags, summary, stages }`. `stages` lists the catalog's staged chain, as `{ title, summary, groups? }`. Only problems that have the `stages/` files below are staged; the rest show the final stage as one problem.
   - `tags` in `meta.ts`: a flat list of `{ kind, name }`, where `kind` is `'library'` (a package or tool), `'framework'`, `'company'` or `'pattern'`. Take them from the problem's "inspired by" sources and the catalog, and only tag real relations: a company only when the referenced work comes from it (for example Stripe for Stripe webhooks, Meta for DataLoader and Relay). A tag name must keep the same kind in every problem; `npm run verify` checks that and that each problem has at least one tag.
   - `statement.md`: the problem statement, written against the final stage. State exact error messages and orders whenever the tests check them.
   - `starter.ts`: the exported API, with types and `throw new Error('Not implemented')` bodies. The JS starter is generated from it.
   - `solution.ts`: the reference solution. It's shown in the Solution tab.
   - `tests.ts`: `export const tests: TestCase<typeof import('./solution')>[]`. Each test is `{ group?, title, input?, run(mod, { expect, clock, flush, deferred }) }`. `group` names the feature or requirement the test covers (usually the catalog stage). The results list shows a header for each group, in first-seen order. Use `clock()` and inject it into the code under test rather than relying on real timers. Give `expect(value, 'label')` a label wherever a bare value would be ambiguous. A test that runs synchronously can't be interrupted by the 2 s per-test timeout, so a perf test should check `performance.now()` inside its loop and bail out early once it's over budget.
   - `broken/*.ts`: at least one plausible wrong solution, which must fail at least one test. Broken files must be **self-contained**. They are loaded as standalone modules, so a runtime `import` from `../solution` does not work, although `import type` is fine. Copy the solution and change it.
   - **To stage a problem** with N stages:
     - Give each `stages[k]` its `groups`, and tag every test with one of them. Stage k runs its own groups plus all earlier ones.
     - Add `stages/1/statement.md` … `stages/N/statement.md`. Stage 1 is a full statement for that stage; later ones describe what the stage adds. `statement.md` is still the full-problem statement.
     - Put the exported types (interfaces and type aliases only, all exported) in their own file: `stages/1/types.ts` … `stages/(N-1)/types.ts`, and `types.ts` for the last stage. The UI shows the stage's file read-only beside the solution, and the runner links it as `./types`. Runtime values (error classes, constants) and private helper types stay in the solution.
     - Add `stages/1/starter.ts`, the stage-1 starter.
     - Add `stages/1/solution.ts` … `stages/(N-1)/solution.ts`. The last stage uses `solution.ts`.
     - Starters and solutions import the types with `import type { … } from './types'` and never redeclare them. The root `starter.ts` and `solution.ts` (full-problem mode) import the root `types.ts`.
     - Optionally add `broken/s<k>-*.ts`, which must fail stage k.
     - An early-stage test must not call anything a later stage introduces.
     - `npm run verify` checks all of this:
       - every test has a group, and each group belongs to exactly one stage;
       - each stage adds tests;
       - the stage-1 starter fails stage 1;
       - each stage reference passes its stage (TS and JS) and fails some test that the next stage adds;
       - each types file holds only exported types, no starter or reference redeclares them, and code that does (saved before the split) passes both as is and after the editor's "Import from types.ts";
       - each `s<k>-` broken fails stage k.
2. Run `python3 scripts/gen-index.py`. It regenerates `src/problems/index.ts` from the folders (warm-ups first, then catalog order) and the Problems table below. Statement, starter and solution are picked up automatically with `import.meta.glob`.
3. Run `npm run verify -- <id>`, `npx tsc --noEmit`, then `npm run build && npm run verify:browser`.

## Problems

The two warm-ups come first. F1 is the catalog's F1 without `maxWait`, `flush()` or throttle yet; its stage 1 is plain trailing debounce (the old F10 warm-up, now folded in). A9 isn't in the catalog.

<!-- problems:start -->
| id | title | theme | difficulty | tests | tags |
|---|---|---|---|---|---|
| F1 | Debounce | Utilities | Medium | 15 | lodash, Debounce |
| A9 | Promise.allSettled | Async | Easy | 12 | Promise combinators |
| A1 | Concurrency limiter | Async | Medium | 16 | p-limit, p-queue, Concurrency limit, Priority queue, Cancellation |
| A2 | Retry with backoff | Async | Medium | 18 | p-retry, Retry, Exponential backoff, Cancellation |
| A3 | Timeouts & cancellation | Async | Medium | 18 | p-timeout, Timeout, Cancellation |
| A4 | Singleflight / request dedupe | Async | Medium | 17 | Go singleflight, SWR, Vercel, Request deduplication, Stale-while-revalidate |
| A5 | Async channel with backpressure | Async | Hard | 15 | it-pushable, Channels, Backpressure, Async iteration |
| A6 | Ordered concurrent map | Async | Medium | 13 | p-map, Concurrency limit, Async iteration |
| A7 | Mutex, semaphore, RW lock | Async | Hard | 16 | async-mutex, Mutex, Semaphore, Read/write lock |
| A8 | Task graph runner | Async | Hard | 15 | Turborepo, Nx, Listr, Vercel, Topological sort, Concurrency limit |
| B1 | LRU cache with TTL | Data/Caches | Medium | 16 | lru-cache, LRU cache, TTL expiry |
| B2 | Range set / availability | Data/Caches | Medium | 16 | Interval set, Free/busy scheduling |
| B3 | Indexed priority queue | Data/Caches | Medium | 14 | Priority queue, Binary heap, Timer scheduler |
| B4 | Rolling metrics window | Data/Caches | Medium | 12 | Prometheus, Sliding window, Ring buffer, Percentiles, Histogram |
| B5 | Sorted set / leaderboard | Data/Caches | Medium | 13 | Redis, Sorted set, Leaderboard |
| B6 | Piece table text buffer | Data/Caches | Hard | 14 | Microsoft, Piece table, Text buffer |
| B7 | Memoization family | Data/Caches | Medium | 13 | memoize-one, reselect, Memoization, LRU cache, Selectors |
| B8 | In-memory table with indexes | Data/Caches | Hard | 14 | minimongo, Dexie, Secondary indexes, Query planning, Live queries |
| C1 | Express router with error middleware | Middleware | Medium | 12 | Express, Middleware, Routing, Error handling |
| C2 | Hook system | Middleware | Hard | 12 | tapable, webpack, Rollup, Plugin hooks, Interceptors |
| C3 | HTTP interceptors + token refresh | Middleware | Hard | 16 | axios, ky, Interceptors, Token refresh, Request deduplication |
| C4 | EventEmitter | Middleware | Medium | 12 | Node.js events, mitt, Event emitter, Pub/sub |
| C5 | DI container | Middleware | Hard | 12 | tsyringe, InversifyJS, Dependency injection, Scoped lifetimes |
| C6 | Loader chain with pitching | Middleware | Hard | 11 | webpack, loader-runner, Loader chain, Middleware |
| C7 | Structured logger | Middleware | Medium | 12 | pino, Structured logging, Redaction |
| C8 | Mini bundler with plugins | Middleware | Hard | 11 | Rollup, Module bundling, Plugin hooks, Code splitting, Topological sort |
| D1 | CLI argument parser | Parsing | Medium | 9 | minimist, yargs, Argument parsing, Did-you-mean suggestions |
| D2 | Semver ranges | Parsing | Medium | 10 | semver, Semantic versioning, Version ranges |
| D3 | Cron next-run | Parsing | Hard | 10 | cron-parser, Cron expressions, Time zones and DST |
| D4 | Template engine | Parsing | Medium | 10 | Mustache, Handlebars, Templating, HTML escaping |
| D5 | Markdown lite | Parsing | Hard | 10 | marked, Markdown, HTML escaping |
| D6 | Route matching | Parsing | Medium | 15 | find-my-way, path-to-regexp, React Router, React, Routing, Reverse routing |
| D7 | Object path get/set/query | Parsing | Medium | 10 | lodash, JSONPath, Path expressions, Immutable updates |
| D8 | Spreadsheet formulas | Parsing | Hard | 10 | HyperFormula, Handsontable, Formula parsing, Dependency graph, Topological sort |
| D9 | CSV parser | Parsing | Medium | 11 | PapaParse, CSV (RFC 4180), Streaming parser |
| D10 | Query string codec | Parsing | Medium | 10 | qs, Query strings, Prototype pollution protection |
| D11 | .env parser | Parsing | Easy | 10 | dotenv, dotenv-expand, Config parsing, Variable expansion |
| E1 | Redux store | State | Medium | 11 | Redux, Reducers, Middleware, Flux |
| E2 | Signals | State | Hard | 19 | Preact Signals, Preact, SolidJS, Signals, Fine-grained reactivity |
| E3 | Immutable produce | State | Hard | 11 | Immer, Copy-on-write, Structural sharing, Proxies, Patches |
| E4 | Undo/redo history | State | Medium | 11 | zundo, Undo/redo, Command pattern, Transactions |
| E5 | State machine interpreter | State | Hard | 11 | XState, State machine, Statecharts |
| E6 | Query cache | Data/Caches | Hard | 15 | TanStack Query, SWR, Vercel, Query cache, Request deduplication, Stale-while-revalidate, Garbage collection |
| E7 | Form state manager | State | Medium | 11 | react-hook-form, Formik, React, Form state, Validation |
| E8 | Tiny store + persist | State | Medium | 11 | Zustand, React, Store, Selectors, Persistence, Migrations |
| F2 | Deep clone | Utilities | Medium | 11 | rfdc, Deep clone, structuredClone |
| F3 | Deep diff & patch | Utilities | Hard | 12 | jsondiffpatch, fast-json-patch, Deep equality, JSON Patch (RFC 6902) |
| F4 | Text diff | Utilities | Hard | 12 | jsdiff, GNU diff, Myers diff, Unified diff |
| F5 | Fuzzy search | Utilities | Medium | 11 | fzf, Fuse.js, Microsoft, Fuzzy matching, Ranking |
| F6 | Schema validation | Parsing | Medium | 16 | Zod, Valibot, Yup, Schema validation |
| F7 | Money math | Utilities | Medium | 12 | dinero.js, Money, Value object, Rounding modes, Intl formatting |
| F8 | Date math | Utilities | Medium | 14 | date-fns, Date math, Time zones and DST, Recurrence (RRULE) |
| F9 | Humanize bytes and durations | Utilities | Easy | 10 | pretty-bytes, ms, Humanized formatting, Intl formatting |
| G1 | Virtual list | Browser/UI | Hard | 15 | TanStack Virtual, react-window, React, Virtualization, Scroll anchoring |
| G2 | Keyboard shortcuts | Browser/UI | Medium | 12 | tinykeys, hotkeys-js, Keyboard shortcuts, Key sequences |
| G3 | Sortable drag-and-drop | Browser/UI | Hard | 11 | dnd-kit, React, Drag and drop, Sortable lists, Tree projection |
| G4 | Roving focus and typeahead | Browser/UI | Medium | 12 | Radix UI, React, Roving focus, Typeahead, WAI-ARIA |
| G5 | Masonry layout | Browser/UI | Medium | 11 | Masonry, react-masonry-css, React, Pinterest, Masonry layout |
| G6 | Toast queue | Browser/UI | Medium | 11 | sonner, react-hot-toast, React, Toast notifications, FIFO queue |
| G7 | Router history | Browser/UI | Medium | 10 | history, React Router, React, Session history, Navigation blocking |
| G8 | Popover positioning | Browser/UI | Hard | 12 | Floating UI, Positioning, Middleware, Collision detection |
| G9 | Rich-text marks | Browser/UI | Hard | 11 | ProseMirror, Slate, Rich text, Normalization, HTML serialization |
| H1 | Batching loader | API/Network | Medium | 11 | dataloader, Meta, Batching, Request deduplication |
| H2 | Rate limiter | API/Network | Medium | 10 | rate-limiter-flexible, Rate limiting, Token bucket, Sliding window |
| H3 | Fetch wrapper | API/Network | Medium | 11 | ky, ofetch, HTTP client, Retry, Exponential backoff, Hooks |
| H4 | Cursor pagination | API/Network | Medium | 11 | Relay, Meta, Cursor pagination, GraphQL connections, Async iteration |
| H5 | Circuit breaker | API/Network | Medium | 11 | opossum, Circuit breaker, Fallback, Sliding window |
| H6 | Offline mutation queue | API/Network | Hard | 15 | Workbox, TanStack Query, Replicache, Google, Offline queue, Retry, Exponential backoff, Persistence |
| H7 | Webhook verify & idempotency | API/Network | Medium | 11 | Stripe, Webhooks, HMAC signatures, Replay protection, Idempotency |
| H8 | HTTP response cache | API/Network | Hard | 11 | cacache, HTTP caching (RFC 9111), Revalidation, Stale-while-revalidate |
| H9 | Reconnecting socket client | API/Network | Hard | 11 | reconnecting-websocket, WebSocket, Reconnect with backoff, Heartbeat, Last-Event-ID resume |
<!-- problems:end -->

## Known gaps

- Reference solutions ship in the JS bundle, so the "locked" Solution tab is a UX nudge, not a secret.
- The main chunk is about 6.3 MB (1.6 MB gzip), mostly Monaco. It isn't code-split yet.
- Only 8 problems are staged so far (F1 with the old F10 folded in, A1 to A4, B1, E1, H1). The other 63 still show the final stage as one problem. Their `stages` metadata already lists their stage chains. Only F1 has per-stage broken solutions (`broken/s1-*`). The other staged problems keep their full-problem brokens, which verify checks against all the tests.
- In `npm run verify`, the check that the A2 stage-3 reference fails stage 4 makes several stage-4 tests wait out their 2 s timeout. That adds about 15 s.
- F6 is runtime only: no `Infer<typeof schema>` type inference.
- H2 keeps its counters in memory. There is no pluggable (Redis-style) store interface.
- Several problems (for example B1, B4 to B6, D6 and G1) include perf tests with time limits that could be flaky on very slow machines.
- No linter is set up.
