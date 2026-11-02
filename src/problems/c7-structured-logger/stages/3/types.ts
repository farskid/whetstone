/** Lowest to highest. LEVELS maps each to 10, 20, ..., 60. */
export type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface Transport {
  /** Receives whole lines, each ending in '\n'. */
  write(chunk: string): void | Promise<void>;
}

export interface LoggerOptions {
  /** Default 'info'. */
  level?: Level;
  transports: Transport[];
  /** Fields on every line. */
  base?: Record<string, unknown>;
  /** Dotted paths; '*' matches any key at that depth. */
  redact?: string[];
  /** Transform a top-level field before serialization. */
  serializers?: Record<string, (value: any) => unknown>;
  /** Default Date.now. */
  now?: () => number;
}

/** log.info('msg'), log.info(obj, 'msg?') or log.error(err, 'msg?'). */
export type LogFn = (objOrMsg?: unknown, msg?: string) => void;

export interface Logger {
  /** Get or set at runtime; an unknown level throws. */
  level: Level;
  trace: LogFn; debug: LogFn; info: LogFn; warn: LogFn; error: LogFn; fatal: LogFn;
  isLevelEnabled(level: Level): boolean;
  /** A logger that adds these fields and shares the transports. */
  child(bindings: Record<string, unknown>): Logger;
  /** Resolves once every line logged before the call has been written. */
  flush(): Promise<void>;
}
