export interface RunOptions {
  priority?: number;
  signal?: AbortSignal;
}

export interface Limiter {
  run<T>(fn: () => T | Promise<T>, options?: RunOptions): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
  concurrency: number;
  clearQueue(): void;
  onIdle(): Promise<void>;
}
