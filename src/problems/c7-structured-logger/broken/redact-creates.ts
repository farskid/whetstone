// Bug: redaction creates missing paths
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

export function serializeError(err: Error, seen: unknown[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = { type: err.constructor?.name ?? 'Error', message: err.message, stack: err.stack };
  seen = [...seen, err];
  for (const k of Object.keys(err)) out[k] = toPlain((err as any)[k], seen);
  if (err.cause !== undefined) out.cause = toPlain(err.cause, seen);
  return out;
}

function toPlain(v: unknown, ancestors: unknown[]): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (v === null || typeof v !== 'object') return typeof v === 'function' ? undefined : v;
  if (ancestors.includes(v)) return '[Circular]';
  if (v instanceof Error) return serializeError(v, ancestors);
  if (typeof (v as any).toJSON === 'function') return toPlain((v as any).toJSON(), ancestors);
  const next = [...ancestors, v];
  if (Array.isArray(v)) return v.map((x) => { const p = toPlain(x, next); return p === undefined ? null : p; });
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v)) {
    const p = toPlain((v as any)[k], next);
    if (p !== undefined) out[k] = p;
  }
  return out;
}

function redactPath(obj: any, path: string[]): void {
  if (obj === null || typeof obj !== 'object') return;
  const [head, ...rest] = path;
  if (head !== '*' && !(head in obj)) obj[head] = rest.length ? {} : undefined;
  const keys = head === '*' ? Object.keys(obj) : [head];
  for (const k of keys) {
    if (rest.length === 0) obj[k] = '[Redacted]';
    else redactPath(obj[k], rest);
  }
}

class Sink {
  buffer = '';
  writing: Promise<void> | null = null;
  constructor(public t: Transport, public onError?: (err: unknown, chunk: string) => void) {}
  push(line: string) {
    this.buffer += line;
    if (!this.writing) this.writing = this.drain();
  }
  private async drain() {
    await Promise.resolve();
    while (this.buffer) {
      const chunk = this.buffer;
      this.buffer = '';
      try {
        await this.t.write(chunk);
      } catch (e) {
        this.onError?.(e, chunk);
      }
    }
    this.writing = null;
  }
  async flush() {
    while (this.writing) await this.writing;
  }
}

interface Shared {
  opts: LoggerOptions;
  sinks: Sink[];
  serializers: Record<string, (v: any) => unknown>;
  redact: string[][];
}

class LoggerImpl {
  private ownLevel: Level | undefined;
  constructor(private shared: Shared, private parent: LoggerImpl | null, private bindings: Record<string, unknown>, level?: Level) {
    this.ownLevel = level;
  }
  get level(): Level {
    return this.ownLevel ?? this.parent!.level;
  }
  set level(l: Level) {
    if (!(l in LEVELS)) throw new Error(`Unknown level ${l}`);
    this.ownLevel = l;
  }
  isLevelEnabled(l: Level) {
    return LEVELS[l] >= LEVELS[this.level];
  }
  child(bindings: Record<string, unknown>): Logger {
    return new LoggerImpl(this.shared, this, bindings) as unknown as Logger;
  }
  flush() {
    return Promise.all(this.shared.sinks.map((s) => s.flush())).then(() => {});
  }
  private allBindings(): Record<string, unknown> {
    return { ...(this.parent ? this.parent.allBindings() : this.shared.opts.base), ...this.bindings };
  }
  log(level: Level, objOrMsg?: unknown, msg?: string) {
    if (!this.isLevelEnabled(level)) return;
    const rate = this.shared.opts.sample?.[level];
    if (rate !== undefined && (this.shared.opts.random ?? Math.random)() >= rate) return;
    let obj: Record<string, unknown> = {};
    if (typeof objOrMsg === 'string') msg = objOrMsg;
    else if (objOrMsg instanceof Error) { obj = { err: objOrMsg }; if (msg === undefined) msg = objOrMsg.message; }
    else if (objOrMsg && typeof objOrMsg === 'object') obj = objOrMsg as Record<string, unknown>;
    const rec: Record<string, unknown> = { level: LEVELS[level], time: (this.shared.opts.now ?? Date.now)() };
    const merged: Record<string, unknown> = { ...this.allBindings(), ...obj };
    for (const [k, v] of Object.entries(merged)) {
      if (k === 'level' || k === 'time' || k === 'msg') continue;
      const ser = this.shared.serializers[k];
      const p = toPlain(ser ? ser(v) : v, []);
      if (p !== undefined) rec[k] = p;
    }
    if (msg !== undefined) rec.msg = msg;
    for (const path of this.shared.redact) redactPath(rec, path);
    const line = JSON.stringify(rec) + '\n';
    for (const s of this.shared.sinks) {
      if (LEVELS[level] >= LEVELS[s.t.level ?? 'trace']) s.push(line);
    }
  }
}
for (const l of Object.keys(LEVELS) as Level[]) {
  (LoggerImpl.prototype as any)[l] = function (this: LoggerImpl, o?: unknown, m?: string) { this.log(l, o, m); };
}

export function createLogger(opts: LoggerOptions): Logger {
  const level = opts.level ?? 'info';
  if (!(level in LEVELS)) throw new Error(`Unknown level ${level}`);
  const shared: Shared = {
    opts,
    sinks: opts.transports.map((t) => new Sink(t, opts.onError)),
    serializers: { err: (e: unknown) => (e instanceof Error ? serializeError(e) : e), ...opts.serializers },
    redact: (opts.redact ?? []).map((p) => p.split('.')),
  };
  return new LoggerImpl(shared, null, {}, level) as unknown as Logger;
}
