Add a concurrency limit, targets, and lifecycle events.

```ts
interface Options {
  failFast?: boolean;
  concurrency?: number;   // default Infinity
  targets?: string[];     // default: every task
  onEvent?: (e: TaskEvent) => void;   // TaskEvent: { type: 'start' | TaskStatus; id: string }
}
```

- At most `concurrency` tasks run at once. When more are ready than there are free slots, the one that comes **earliest in the input array** starts first, even if it became ready later than the others. <!-- tests: concurrency limit, with input order as priority | a newly-ready task earlier in the input jumps the ready queue -->
- With `targets`, only those tasks and their transitive deps take part. Other tasks don't run and don't appear in the report at all. A target that isn't a task id rejects the run (message contains `Unknown` and the id) before anything runs, like the other validation errors. <!-- tests: targets run only what they need | unknown targets reject before anything runs -->
- `onEvent` gets `start` just before a task's `run` is called, then `success` or `failed` when it settles, or `skipped` for a task that never ran. Every task in the run gets exactly one final event. <!-- tests: events: start before run, exactly one final event per task -->
