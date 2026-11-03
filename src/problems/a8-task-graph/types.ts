export interface TaskContext {
  /** Results of this task's direct deps, keyed by id. */
  results: Record<string, unknown>;
  /** Shared by every task; aborted on the first failure when `failFast` is on. */
  signal: AbortSignal;
}

export interface Task {
  id: string;
  /** Ids that must succeed before this task starts. Default: none. */
  deps?: string[];
  run(ctx: TaskContext): unknown | Promise<unknown>;
}

export type TaskStatus = 'success' | 'failed' | 'skipped';

/** One lifecycle event: `start`, then the task's final status. */
export interface TaskEvent {
  type: 'start' | TaskStatus;
  id: string;
}

export interface Options {
  /** Max tasks running at once. Default Infinity. */
  concurrency?: number;
  /** Stop starting tasks after the first failure. Default false. */
  failFast?: boolean;
  /** Only run these and everything they (transitively) depend on. Default: all tasks. */
  targets?: string[];
  /** Lifecycle events: `start`, then one final event per task. */
  onEvent?: (e: TaskEvent) => void;
}

export interface Report {
  status: Record<string, TaskStatus>;
  /** Only successful tasks. */
  results: Record<string, unknown>;
  /** Only failed tasks. */
  errors: Record<string, unknown>;
}
