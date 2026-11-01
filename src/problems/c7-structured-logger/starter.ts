export type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export const LEVELS: Record<Level, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

export interface Transport {
  level?: Level;
  write(chunk: string): void | Promise<void>;
}
export interface LoggerOptions {
  level?: Level;
  transports: Transport[];
  base?: Record<string, unknown>;
  redact?: string[];
  serializers?: Record<string, (value: any) => unknown>;
  sample?: Partial<Record<Level, number>>;
  random?: () => number;
  now?: () => number;
  onError?: (err: unknown, chunk: string) => void;
}
type LogFn = (objOrMsg?: unknown, msg?: string) => void;
export interface Logger {
  level: Level;
  trace: LogFn; debug: LogFn; info: LogFn; warn: LogFn; error: LogFn; fatal: LogFn;
  isLevelEnabled(level: Level): boolean;
  child(bindings: Record<string, unknown>): Logger;
  flush(): Promise<void>;
}

export function serializeError(err: Error): Record<string, unknown> {
  throw new Error('Not implemented');
}

export function createLogger(opts: LoggerOptions): Logger {
  throw new Error('Not implemented');
}
