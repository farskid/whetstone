export interface Limiter {
  run<T>(fn: () => T | Promise<T>): Promise<T>;
}
