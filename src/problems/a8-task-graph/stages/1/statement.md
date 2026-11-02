Build `runTaskGraph`, the core of a monorepo task runner like **Turborepo** or **Nx**. Tasks depend on other tasks, and each one runs as soon as its dependencies have succeeded.

```ts
const report = await runTaskGraph([
  { id: 'test',  deps: ['build'], run: ({ results }) => test(results.build) },
  { id: 'build', run: () => build() },
  { id: 'lint',  run: () => lint() },
]);

report.status;  // { build: 'success', lint: 'success', test: 'success' }
report.results; // { build: …, lint: …, test: … }
```

```ts
interface Task {
  id: string;
  deps?: string[];   // default: none
  run(ctx: { results: Record<string, unknown> }): unknown | Promise<unknown>;
}
interface Report {
  status: Record<string, 'success'>;
  results: Record<string, unknown>;
  errors: Record<string, unknown>;   // always {} for now
}
function runTaskGraph(tasks: Task[]): Promise<Report>;
```

- A task starts once **all** of its deps have finished. Tasks whose deps are done all run at the same time; there is no limit yet.
- When several tasks become ready together, call their `run` in input-array order.
- `ctx.results` holds exactly the task's **direct** deps' results, keyed by id (not deps of deps).
- `run` may return a plain value or a promise. The task's result is the resolved value.
- The promise resolves once every task has finished, with `status[id] = 'success'` and `results[id]` for every task, and `errors: {}`. An empty task list resolves to `{ status: {}, results: {}, errors: {} }`.
- For this stage you may assume the input is valid (unique ids, known deps, no cycles) and that every task succeeds. Later stages handle the rest.
