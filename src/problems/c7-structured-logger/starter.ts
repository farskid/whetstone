import type { Level, LoggerOptions, Logger } from './types';

export const LEVELS: Record<Level, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

export function serializeError(err: Error): Record<string, unknown> {
  throw new Error('Not implemented');
}

export function createLogger(opts: LoggerOptions): Logger {
  throw new Error('Not implemented');
}
