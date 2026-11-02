export interface RunOptions {
  priority?: number;
}

export interface Limiter {
  run<T>(fn: () => T | Promise<T>, options?: RunOptions): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
  clearQueue(): void;
  onIdle(): Promise<void>;
}
