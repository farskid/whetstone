import type { Expect } from './expect';
import type { FakeClock } from './clock';

export type Language = 'ts' | 'js';

/** Everything a test gets besides the user's module. */
export interface TestContext {
  expect: Expect;
  /** A fresh deterministic clock (now() starts at 0). */
  clock(start?: number): FakeClock;
  /** Let pending promise callbacks run (one macrotask turn). */
  flush(): Promise<void>;
  /** Make a promise you resolve/reject by hand. */
  deferred<T = unknown>(): Deferred<T>;
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason?: unknown): void;
}

export interface TestCase<M = any> {
  title: string;
  /** Short human description of the input/scenario, shown on failure. */
  input?: string;
  run(mod: M, t: TestContext): void | Promise<void>;
}

export type TestStatus = 'pass' | 'fail' | 'timeout';

export interface TestError {
  message: string;
  expected?: string;
  actual?: string;
  stack?: string;
}

export interface TestResult {
  index: number;
  title: string;
  input?: string;
  status: TestStatus;
  durationMs: number;
  error?: TestError;
  logs: string[];
}

export interface RunSummary {
  results: TestResult[];
  /** Compile or module-load error (no tests ran). */
  compileError?: string;
  /** Module-level console output (top-level code). */
  moduleLogs: string[];
  passed: number;
  total: number;
  /** Set when the whole run was killed (infinite loop, hard timeout). */
  aborted?: string;
}
