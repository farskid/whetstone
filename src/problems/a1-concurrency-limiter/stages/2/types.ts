export interface Limiter {
  run<T>(fn: () => T | Promise<T>): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
  onIdle(): Promise<void>;
}
