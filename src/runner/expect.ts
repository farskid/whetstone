import { format } from './format';

export class AssertionError extends Error {
  expected?: string;
  actual?: string;
  constructor(message: string, opts: { expected?: unknown; actual?: unknown; hasExpected?: boolean } = {}) {
    super(message);
    this.name = 'AssertionError';
    if ('expected' in opts) this.expected = format(opts.expected);
    if ('actual' in opts) this.actual = format(opts.actual);
  }
}

/** Structural equality: NaN equals NaN, Maps/Sets/Dates compared by content, key order ignored. */
export function deepEqual(a: unknown, b: unknown, seen = new Map<object, object>()): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number') return a === b; // 0 vs -0 equal here
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (seen.get(a) === b) return true;
  seen.set(a, b);
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    // allow plain objects across realms / null-proto
    const pa = Object.getPrototypeOf(a), pb = Object.getPrototypeOf(b);
    const plain = (p: unknown) => p === null || p === Object.prototype;
    if (!(plain(pa) && plain(pb))) return false;
  }
  if (a instanceof Date) return a.getTime() === (b as Date).getTime();
  if (a instanceof RegExp) return String(a) === String(b);
  if (a instanceof Error) return a.message === (b as Error).message && a.name === (b as Error).name;
  if (a instanceof Map) {
    const bm = b as Map<unknown, unknown>;
    if (a.size !== bm.size) return false;
    for (const [k, v] of a) if (!bm.has(k) || !deepEqual(v, bm.get(k), seen)) return false;
    return true;
  }
  if (a instanceof Set) {
    const bs = b as Set<unknown>;
    if (a.size !== bs.size) return false;
    for (const v of a) if (!bs.has(v)) return false;
    return true;
  }
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], bb[i], seen)) return false;
    return true;
  }
  const ka = Object.keys(a).filter((k) => (a as any)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as any)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual((a as any)[k], (b as any)[k], seen)) return false;
  return true;
}

export interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeUndefined(): void;
  toBeNull(): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toBeLessThanOrEqual(n: number): void;
  toBeCloseTo(n: number, digits?: number): void;
  toContain(item: unknown): void;
  toHaveLength(n: number): void;
  toBeInstanceOf(ctor: Function): void;
  /** fn must throw; optional substring / RegExp to match the message. */
  toThrow(match?: string | RegExp): void;
  /** promise must reject; optional substring / RegExp / predicate. */
  toReject(match?: string | RegExp | ((e: unknown) => boolean)): Promise<void>;
  toResolve(): Promise<unknown>;
  not: Omit<Matchers, 'not' | 'toThrow' | 'toReject' | 'toResolve'> & { toThrow(): void };
}

export type Expect = ((actual: unknown, label?: string) => Matchers) & {
  fail(message: string): never;
  /** Assert a promise is still pending after a flush. */
  pending(p: Promise<unknown>, flush: () => Promise<void>): Promise<void>;
};

function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function matchesMessage(e: unknown, match?: string | RegExp | ((e: unknown) => boolean)): boolean {
  if (match === undefined) return true;
  if (typeof match === 'function') return match(e);
  const m = msgOf(e);
  return typeof match === 'string' ? m.includes(match) : match.test(m);
}

export function createExpect(): Expect {
  const make = (actual: unknown, label?: string, negate = false): any => {
    const prefix = label ? `${label}: ` : '';
    const check = (ok: boolean, message: string, expected?: unknown) => {
      if (negate ? ok : !ok) {
        throw new AssertionError(prefix + (negate ? `not: ${message}` : message), {
          actual,
          expected: negate ? `anything except ${format(expected)}` : expected,
        });
      }
    };
    const m: any = {
      toBe: (e: unknown) => check(Object.is(actual, e), `expected ${format(actual)} to be ${format(e)}`, e),
      toEqual: (e: unknown) => check(deepEqual(actual, e), `expected values to be deeply equal`, e),
      toBeTruthy: () => check(!!actual, `expected ${format(actual)} to be truthy`, 'truthy'),
      toBeFalsy: () => check(!actual, `expected ${format(actual)} to be falsy`, 'falsy'),
      toBeUndefined: () => check(actual === undefined, `expected ${format(actual)} to be undefined`, undefined),
      toBeNull: () => check(actual === null, `expected ${format(actual)} to be null`, null),
      toBeGreaterThan: (n: number) => check((actual as number) > n, `expected ${format(actual)} > ${n}`, `> ${n}`),
      toBeGreaterThanOrEqual: (n: number) => check((actual as number) >= n, `expected ${format(actual)} >= ${n}`, `>= ${n}`),
      toBeLessThan: (n: number) => check((actual as number) < n, `expected ${format(actual)} < ${n}`, `< ${n}`),
      toBeLessThanOrEqual: (n: number) => check((actual as number) <= n, `expected ${format(actual)} <= ${n}`, `<= ${n}`),
      toBeCloseTo: (n: number, digits = 2) => check(typeof actual === 'number' && Math.abs(actual - n) < Math.pow(10, -digits) / 2, `expected ${format(actual)} to be close to ${n}`, n),
      toContain: (item: unknown) => {
        const ok = typeof actual === 'string' ? actual.includes(item as string) : Array.isArray(actual) ? actual.some((x) => deepEqual(x, item)) : false;
        check(ok, `expected ${format(actual)} to contain ${format(item)}`, item);
      },
      toHaveLength: (n: number) => check((actual as any)?.length === n, `expected length ${n}, got ${(actual as any)?.length}`, n),
      toBeInstanceOf: (ctor: Function) => check(actual instanceof (ctor as any), `expected value to be an instance of ${ctor.name}`, ctor.name),
      toThrow: (match?: string | RegExp) => {
        if (typeof actual !== 'function') throw new AssertionError(prefix + 'toThrow() needs a function');
        let threw = false, err: unknown;
        try { (actual as Function)(); } catch (e) { threw = true; err = e; }
        if (negate) {
          if (threw) throw new AssertionError(prefix + `expected not to throw, but threw: ${msgOf(err)}`, { actual: err });
          return;
        }
        if (!threw) throw new AssertionError(prefix + 'expected function to throw', { expected: match ?? 'an error', actual: 'no error' });
        if (!matchesMessage(err, match)) throw new AssertionError(prefix + `thrown error did not match`, { expected: match, actual: msgOf(err) });
      },
      toReject: async (match?: string | RegExp | ((e: unknown) => boolean)) => {
        let rejected = false, err: unknown, val: unknown;
        try { val = await (actual as Promise<unknown>); } catch (e) { rejected = true; err = e; }
        if (!rejected) throw new AssertionError(prefix + 'expected promise to reject', { expected: match ?? 'rejection', actual: val });
        if (!matchesMessage(err, match)) throw new AssertionError(prefix + 'rejection did not match', { expected: typeof match === 'function' ? 'predicate' : match, actual: err });
      },
      toResolve: async () => {
        try { return await (actual as Promise<unknown>); } catch (e) {
          throw new AssertionError(prefix + `expected promise to resolve, but it rejected: ${msgOf(e)}`, { actual: e });
        }
      },
    };
    if (!negate) m.not = make(actual, label, true);
    return m;
  };
  const expect = ((actual: unknown, label?: string) => make(actual, label)) as Expect;
  expect.fail = (message: string) => { throw new AssertionError(message); };
  expect.pending = async (p, flush) => {
    let settled = false;
    p.then(() => (settled = true), () => (settled = true));
    await flush();
    if (settled) throw new AssertionError('expected promise to still be pending');
  };
  return expect;
}
