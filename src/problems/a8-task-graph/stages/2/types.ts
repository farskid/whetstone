export interface TaskContext {
  /** Results of this task's direct deps, keyed by id. */
  results: Record<string, unknown>;
}

export interface Task {
  id: string;
  /** Ids that must succeed before this task starts. Default: none. */
  deps?: string[];
  run(ctx: TaskContext): unknown | Promise<unknown>;
}

export interface Report {
  /** Every task's status. In this stage every task ends as 'success'. */
  status: Record<string, 'success'>;
  /** Every task's resolved value. */
  results: Record<string, unknown>;
  /** Always {} in this stage. */
  errors: Record<string, unknown>;
}
