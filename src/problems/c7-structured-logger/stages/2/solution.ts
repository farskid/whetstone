import type { Level, Transport, LoggerOptions, Logger } from './types';

export const LEVELS: Record<Level, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

function errorFields(err: Error): Record<string, unknown> {
  return { type: err.constructor?.name ?? 'Error', message: err.message, stack: err.stack };
}

class Sink {
  private pending: Promise<unknown>[] = [];
  constructor(public t: Transport) {}
  push(line: string) {
    this.pending.push(Promise.resolve(this.t.write(line)).catch(() => {}));
  }
  async flush() {
    await Promise.all(this.pending);
  }
}

interface Shared {
  opts: LoggerOptions;
  sinks: Sink[];
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
    let obj: Record<string, unknown> = {};
    if (typeof objOrMsg === 'string') msg = objOrMsg;
    else if (objOrMsg instanceof Error) { obj = { err: objOrMsg }; if (msg === undefined) msg = objOrMsg.message; }
    else if (objOrMsg && typeof objOrMsg === 'object') obj = objOrMsg as Record<string, unknown>;
    const rec: Record<string, unknown> = { level: LEVELS[level], time: (this.shared.opts.now ?? Date.now)() };
    const merged: Record<string, unknown> = { ...this.allBindings(), ...obj };
    for (const [k, v] of Object.entries(merged)) {
      if (k === 'level' || k === 'time' || k === 'msg') continue;
      rec[k] = v instanceof Error ? errorFields(v) : v;
    }
    if (msg !== undefined) rec.msg = msg;
    const line = JSON.stringify(rec) + '\n';
    for (const s of this.shared.sinks) s.push(line);
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
    sinks: opts.transports.map((t) => new Sink(t)),
  };
  return new LoggerImpl(shared, null, {}, level) as unknown as Logger;
}
