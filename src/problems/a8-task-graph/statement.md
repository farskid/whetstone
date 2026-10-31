# Task graph runner

Build `runTaskGraph`, the core of a monorepo task runner like **Turborepo** or **Nx**. Tasks depend on other tasks. Each one runs as soon as its dependencies have succeeded, with as much parallelism as you allow.

```ts
const report = await runTaskGraph([
  { id: 'lint',  run: () => lint() },
  { id: 'build', run: () => build() },
  { id: 'test',  deps: ['build'], run: ({ results }) => test(results.build) },
  { id: 'ship',  deps: ['lint', 'test'], run: ({ signal }) => deploy({ signal }) },
], { concurrency: 2 });

report.status; // { lint: 'success', build: 'success', test: 'success', ship: 'success' }
```

## API

```ts
interface Task {
  id: string;
  deps?: string[];
  run(ctx: { results: Record<string, unknown>; signal: AbortSignal }): unknown | Promise<unknown>;
}
interface Options {
  concurrency?: number;     // default Infinity
  failFast?: boolean;       // default false
  targets?: string[];       // only run these and everything they (transitively) depend on
  onEvent?: (e: { type: 'start' | 'success' | 'failed' | 'skipped'; id: string }) => void;
}
interface Report {
  status: Record<string, 'success' | 'failed' | 'skipped'>;
  results: Record<string, unknown>;   // only successful tasks
  errors: Record<string, unknown>;    // only failed tasks
}
function runTaskGraph(tasks: Task[], options?: Options): Promise<Report>;
```

## Rules

**Validation.** If any of these fail, the promise rejects with an `Error` and **no task runs**:
- Duplicate ids. The message contains `Duplicate` and the id.
- An unknown dep or target. The message contains `Unknown` and the missing id.
- A cycle. The message is exactly `Cycle: a -> b -> c -> a`. To find it, run a depth-first search that visits tasks in input order and each task's deps in the order they're listed. Report the first cycle the search closes, starting and ending at the task that closes it. A task that depends on itself is `Cycle: a -> a`.

**Running**
- A task starts once **all** of its deps have succeeded. `ctx.results` holds exactly its direct deps' results, keyed by id.
- At most `concurrency` tasks run at once. When more are ready than there are free slots, the one that comes **earliest in the input array** starts first.
- A task whose `run` throws synchronously or rejects is `'failed'`, and its error goes in `errors[id]`.

**Failures**
- Every transitive dependent of a failed task is `'skipped'` and never runs.
- With `failFast: false` (the default), unrelated tasks keep running.
- With `failFast: true`, after the first failure no new task starts. Every task that hasn't started is `'skipped'`, and the shared `ctx.signal` is **aborted** so running tasks can stop early. Running tasks still settle normally and are recorded as `'success'` or `'failed'`.
- The promise resolves when nothing is running any more. Failures do **not** reject it.

**Targets.** With `targets`, only those tasks and their transitive deps take part. Other tasks don't appear in the report at all.

**Events.** `onEvent` gets `start` before a task's `run` is called, then `success` or `failed`, or `skipped` for a task that never ran. Every task in the run gets exactly one final event.
