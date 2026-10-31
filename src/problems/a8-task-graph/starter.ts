export interface TaskContext {
  results: Record<string, unknown>;
  signal: AbortSignal;
}

export interface Task {
  id: string;
  deps?: string[];
  run(ctx: TaskContext): unknown | Promise<unknown>;
}

export type TaskStatus = 'success' | 'failed' | 'skipped';

export interface Options {
  concurrency?: number;
  failFast?: boolean;
  targets?: string[];
  onEvent?: (e: { type: 'start' | TaskStatus; id: string }) => void;
}

export interface Report {
  status: Record<string, TaskStatus>;
  results: Record<string, unknown>;
  errors: Record<string, unknown>;
}

export async function runTaskGraph(tasks: Task[], options: Options = {}): Promise<Report> {
  throw new Error('Not implemented');
}
