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

export interface Options {
  /** Stop starting tasks after the first failure. Default false. */
  failFast?: boolean;
}

export interface Report {
  status: Record<string, TaskStatus>;
  /** Only successful tasks. */
  results: Record<string, unknown>;
  /** Only failed tasks. */
  errors: Record<string, unknown>;
}
