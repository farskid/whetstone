Handle failing tasks.

```ts
interface TaskContext {
  results: Record<string, unknown>;
  signal: AbortSignal;   // new: one signal shared by every task in the run
}
type TaskStatus = 'success' | 'failed' | 'skipped';
interface Options { failFast?: boolean }   // default false
interface Report {
  status: Record<string, TaskStatus>;
  results: Record<string, unknown>;   // only successful tasks
  errors: Record<string, unknown>;    // only failed tasks
}
function runTaskGraph(tasks: Task[], options?: Options): Promise<Report>;
```

- A task whose `run` throws synchronously or rejects is `'failed'`, and its error goes in `errors[id]`. Failures do **not** reject the run.
- Every transitive dependent of a failed task is `'skipped'` and never runs.
- With `failFast: false` (the default), unrelated tasks keep running and the signal is never aborted.
- With `failFast: true`, after the first failure no new task starts, even one whose deps all succeed later. Every task that hasn't started is `'skipped'`, and `ctx.signal` is **aborted** so running tasks can stop early. Running tasks still settle normally and are recorded as `'success'` or `'failed'`.
- The promise resolves when nothing is running any more.
