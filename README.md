# Practical: library-style coding practice

This is a static site of practical coding problems. You rebuild the core of libraries you use every day: a concurrency limiter, a task graph, an LRU cache, HTTP interceptors, a router, signals, a query cache, a schema validator, a virtual list and an offline queue.

You write TypeScript or JavaScript in Monaco, which gives you full types and autocomplete. A real test suite runs in a Web Worker in your browser. There is no backend.

## Run it

```bash
npm install
npm run dev              # dev server with hot reload (http://localhost:5173)
npm run build            # tsc --noEmit + vite build → dist/ (static, hash routing; host anywhere)
npm run preview          # serve dist/ locally
npm run verify           # Node: every reference solution passes, the starter fails, and every broken/ solution fails ≥1 test
npm run verify:browser   # after build: every reference solution (TS and JS) passes in the real browser worker
npm run screenshots      # after build: writes screenshots/*.png (needs Chrome; set CHROME_PATH if not /usr/bin/google-chrome)
npm run verify -- e2-signals   # verify only one problem
```

## How it works

- **List** (`#/`) shows search, difficulty, theme and status filters, a solved marker, a progress count, and JSON export and import of progress.
- **Problem** (`#/p/<id>`) has the following parts:
  - A markdown statement.
  - A Monaco editor with a TS/JS toggle. Each language keeps its own code, and the starter's types power autocomplete.
  - Reset, and Run as often as you like with Ctrl/⌘+Enter.
  - The test list is visible before you run anything. When a test fails, it shows the input, expected value, actual value, the error with a line in your code, and console output.
  - The solution tab unlocks once you have solved the problem, or after you confirm.
- **Runner** (`src/runner/`):
  - Sucrase strips the types from your code. The code is then loaded as an ES module inside a Web Worker. A 5s watchdog kills the worker on infinite loops.
  - Time-based problems use a `FakeClock` passed into your code, so the tests are deterministic.
  - The same core runs under Node for `npm run verify`.
- **Persistence**: everything is kept in `localStorage` under `practical:v1`: code per problem and language, solved state, attempts, theme and language.

## Add a problem

1. Create `src/problems/<id>/`, where `<id>` is the URL slug (for example `x1-thing`), with these files:
   - `meta.ts`: `export const meta: ProblemMeta = { id, catalogId, title, theme, difficulty, inspiredBy, summary, stages }`. `stages` lists the catalog's staged chain. v1 shows the **final stage** as the whole problem.
   - `statement.md`: the problem statement, written against the final stage. State exact error messages and orders whenever the tests check them.
   - `starter.ts`: the exported API, with types and `throw new Error('Not implemented')` bodies. The JS starter is generated from it.
   - `solution.ts`: the reference solution. It's shown in the Solution tab.
   - `tests.ts`: `export const tests: TestCase<typeof import('./solution')>[]`. Each test is `{ title, input?, run(mod, { expect, clock, flush, deferred }) }`. Use `clock()` and inject it into the code under test rather than relying on real timers. Give `expect(value, 'label')` a label wherever a bare value would be ambiguous.
   - `broken/*.ts`: at least one plausible wrong solution, which must fail at least one test. Broken files must be **self-contained**. They are loaded as standalone modules, so a runtime `import` from `../solution` does not work, although `import type` is fine. Copy the solution and change it.
2. Register the tests in `src/problems/index.ts`: import `meta` and `tests`, then add `{ ...meta, tests }` to the array. Statement, starter and solution are picked up automatically with `import.meta.glob`.
3. Run `npm run verify -- <id>`, `npx tsc --noEmit`, then `npm run build && npm run verify:browser`.

## Problems (v1)

The two Easy warm-ups are listed first. F1 is the easy cut of the catalog's F1 (no `maxWait`, `flush()` or throttle yet), and A9 isn't in the catalog.

| id | title | theme | difficulty |
|---|---|---|---|
| A9 | Promise.allSettled (warm-up) | Async | Easy |
| F1 | Debounce (warm-up) | Utilities | Easy |
| A1 | Concurrency limiter | Async | Medium |
| A8 | Task graph runner | Async | Hard |
| B1 | LRU cache with TTL | Data/Caches | Medium |
| C3 | HTTP interceptors + token refresh | Middleware | Hard |
| D6 | Route matching | Parsing | Medium |
| E2 | Signals | State | Hard |
| E6 | Query cache | Data/Caches | Hard |
| F6 | Schema validation (runtime only) | Parsing | Medium |
| G1 | Virtual list | Browser/UI | Hard |
| H6 | Offline mutation queue | API/Network | Hard |

## Known gaps

- Reference solutions ship in the JS bundle, so the "locked" Solution tab is a UX nudge, not a secret.
- The main chunk is about 4.7 MB (1.2 MB gzip), mostly Monaco. It isn't code-split yet.
- Stages are recorded in metadata only. There is no step-by-step staged mode yet.
- F6 is runtime only: no `Infer<typeof schema>` type inference.
- B1, D6 and G1 include perf tests with time limits (400 to 500 ms) that could be flaky on very slow machines.
- No linter is set up.
