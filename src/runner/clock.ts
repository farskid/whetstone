/**
 * Deterministic clock injected into time-based problems.
 * User code only sees the `Clock` shape: { now, setTimeout, clearTimeout }.
 * Tests drive it with advance()/runAll().
 */
export interface Clock {
  now(): number;
  setTimeout(fn: (...args: any[]) => void, ms?: number, ...args: any[]): number;
  clearTimeout(id: unknown): void;
}

interface Timer { id: number; at: number; seq: number; fn: (...a: any[]) => void; args: any[] }

/** One macrotask turn: lets every queued promise reaction run. */
export function macrotask(): Promise<void> {
  if (typeof (globalThis as any).setImmediate === 'function') return new Promise((r) => (globalThis as any).setImmediate(r));
  return new Promise((r) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => { ch.port1.close(); r(); };
    ch.port2.postMessage(0);
  });
}

export class FakeClock implements Clock {
  private t: number;
  private seq = 0;
  private nextId = 1;
  private timers = new Map<number, Timer>();

  constructor(start = 0) { this.t = start; }

  now = (): number => this.t;

  setTimeout = (fn: (...args: any[]) => void, ms = 0, ...args: any[]): number => {
    const id = this.nextId++;
    this.timers.set(id, { id, at: this.t + Math.max(0, Number(ms) || 0), seq: this.seq++, fn, args });
    return id;
  };

  clearTimeout = (id: unknown): void => { this.timers.delete(id as number); };

  /** Number of timers that are scheduled and not yet fired. */
  pendingTimers(): number { return this.timers.size; }

  private nextTimer(limit: number): Timer | undefined {
    let best: Timer | undefined;
    for (const tm of this.timers.values()) {
      if (tm.at > limit) continue;
      if (!best || tm.at < best.at || (tm.at === best.at && tm.seq < best.seq)) best = tm;
    }
    return best;
  }

  /** Move time forward by ms, firing due timers in order and flushing promises between them. */
  async advance(ms: number): Promise<void> {
    const target = this.t + ms;
    await macrotask();
    for (let guard = 0; guard < 100000; guard++) {
      const tm = this.nextTimer(target);
      if (!tm) break;
      this.timers.delete(tm.id);
      this.t = Math.max(this.t, tm.at);
      tm.fn(...tm.args);
      await macrotask();
    }
    this.t = target;
    await macrotask();
  }

  /** Fire timers until none are left (bounded). */
  async runAll(maxTimers = 10000): Promise<void> {
    await macrotask();
    for (let i = 0; i < maxTimers; i++) {
      const tm = this.nextTimer(Infinity);
      if (!tm) return;
      this.timers.delete(tm.id);
      this.t = Math.max(this.t, tm.at);
      tm.fn(...tm.args);
      await macrotask();
    }
    throw new Error(`runAll(): more than ${maxTimers} timers fired; probably an endless timer loop`);
  }
}
