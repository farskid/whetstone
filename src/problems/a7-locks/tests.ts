import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Mutex';
const G2 = 'Weighted semaphore';
const G3 = 'Acquire timeout';
const G4 = 'Read/write lock';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'mutex runs critical sections one at a time, in call order',
    async run({ Mutex }, { expect, clock }) {
      const c = clock(); const m = new Mutex({ clock: c });
      const log: string[] = [];
      const job = (name: string) => m.runExclusive(() => new Promise<void>((r) => { log.push(`${name}+`); c.setTimeout(() => { log.push(`${name}-`); r(); }, 10); }));
      const all = Promise.all([job('a'), job('b'), job('c')]);
      await c.runAll(); await all;
      expect(log).toEqual(['a+', 'a-', 'b+', 'b-', 'c+', 'c-']);
    },
  },
  {
    group: G1,
    title: 'locked reflects the state, and the first acquire is synchronous',
    async run({ Mutex }, { expect }) {
      const m = new Mutex();
      expect(m.locked, 'fresh').toBe(false);
      const p = m.acquire();
      expect(m.locked, 'right after acquire()').toBe(true);
      (await p)();
      expect(m.locked, 'after release').toBe(false);
    },
  },
  {
    group: G1,
    title: 'runExclusive releases even when fn throws',
    async run({ Mutex }, { expect }) {
      const m = new Mutex();
      await expect(m.runExclusive(async () => { throw new Error('boom'); })).toReject('boom');
      expect(m.locked).toBe(false);
      expect(await m.runExclusive(() => 7)).toBe(7);
    },
  },
  {
    group: G1,
    title: 'calling release twice is a no-op',
    async run({ Semaphore }, { expect }) {
      const s = new Semaphore(2);
      const r1 = await s.acquire();
      await s.acquire();
      r1(); r1();
      expect(s.available).toBe(1);
    },
  },
  {
    group: G2,
    title: 'weights: holds units until released',
    async run({ Semaphore }, { expect, flush }) {
      const s = new Semaphore(5);
      const r3 = await s.acquire(3);
      expect(s.available).toBe(2);
      let got = false;
      s.acquire(3).then(() => { got = true; });
      await flush();
      expect(got, 'weight 3 granted with 2 free').toBe(false);
      r3(); await flush();
      expect(got, 'after release').toBe(true);
      expect(s.available).toBe(2);
    },
  },
  {
    group: G2,
    title: 'strict FIFO: a heavy waiter blocks lighter ones behind it',
    input: 'capacity 4; hold 3 + 1; queue acquire(4) then acquire(1); release the 1',
    async run({ Semaphore }, { expect, flush }) {
      const s = new Semaphore(4);
      const r3 = await s.acquire(3);
      const r1 = await s.acquire(1);
      const order: string[] = [];
      s.acquire(4).then((rel) => { order.push('heavy'); rel(); });
      s.acquire(1).then(() => { order.push('light'); });
      await flush();
      expect(s.waiting).toBe(2);
      r1(); await flush();
      expect(order, 'light must wait behind heavy even though 1 unit is free').toEqual([]);
      r3(); await flush();
      expect(order).toEqual(['heavy', 'light']);
    },
  },
  {
    group: G2,
    title: 'a release grants every waiter at the front that now fits',
    async run({ Semaphore }, { expect, flush }) {
      const s = new Semaphore(3);
      const r = await s.acquire(3);
      const granted: number[] = [];
      for (const w of [1, 1, 1]) s.acquire(w).then(() => granted.push(w));
      r(); await flush();
      expect(granted.length).toBe(3);
      expect(s.available).toBe(0);
    },
  },
  {
    group: G2,
    title: 'tryAcquire grants or returns null, never queues',
    async run({ Semaphore }, { expect }) {
      const s = new Semaphore(2);
      const a = s.tryAcquire(2);
      expect(typeof a, 'first').toBe('function');
      expect(s.tryAcquire(1), 'when full').toBeNull();
      expect(s.waiting).toBe(0);
      a!();
      await s.acquire(1);
      s.acquire(2);
      expect(s.available, 'free units').toBe(1);
      expect(s.tryAcquire(1), 'with a queue ahead').toBeNull();
    },
  },
  {
    group: G2,
    title: 'bad weights throw RangeError',
    run({ Semaphore }, { expect }) {
      const s = new Semaphore(3);
      for (const w of [0, -1, 1.5, 4]) {
        let err: unknown;
        try { s.acquire(w); } catch (e) { err = e; }
        expect(err instanceof RangeError, `acquire(${w})`).toBe(true);
      }
      expect(() => s.tryAcquire(9)).toThrow();
    },
  },
  {
    group: G3,
    title: 'acquire timeout rejects and the waiter never gets the lock',
    async run({ Semaphore }, { expect, clock, flush }) {
      const c = clock(); const s = new Semaphore(1, { clock: c });
      const r = await s.acquire();
      const p = s.acquire(1, { timeout: 100 });
      p.catch(() => {});
      await c.advance(100);
      await expect(p).toReject('Acquire timed out');
      expect(s.waiting).toBe(0);
      r(); await flush();
      expect(s.available, 'free after release').toBe(1);
    },
  },
  {
    group: G3,
    title: 'a timed-out heavy waiter unblocks lighter ones behind it',
    async run({ Semaphore }, { expect, clock, flush }) {
      const c = clock(); const s = new Semaphore(2, { clock: c });
      await s.acquire(1);
      const heavy = s.acquire(2, { timeout: 50 });
      heavy.catch(() => {});
      let light = false;
      s.acquire(1).then(() => { light = true; });
      await flush();
      expect(light, 'before timeout').toBe(false);
      await c.advance(50);
      await flush();
      expect(light, 'after the heavy waiter timed out').toBe(true);
    },
  },
  {
    group: G3,
    title: 'a granted acquire clears its timeout timer',
    async run({ Mutex }, { expect, clock }) {
      const c = clock(); const m = new Mutex({ clock: c });
      const r = await m.acquire();
      const p = m.acquire({ timeout: 1000 });
      r();
      await p;
      expect(c.pendingTimers()).toBe(0);
    },
  },
  {
    group: G4,
    title: 'readers share the lock; a writer is exclusive',
    async run({ RWLock }, { expect, flush }) {
      const l = new RWLock();
      const r1 = await l.readLock(); const r2 = await l.readLock();
      let w = false;
      const wp = l.writeLock().then((rel) => { w = true; return rel; });
      await flush();
      expect(w, 'writer while readers hold').toBe(false);
      r1(); await flush();
      expect(w, 'one reader left').toBe(false);
      r2(); await flush();
      expect(w, 'all readers gone').toBe(true);
      let reader = false;
      l.readLock().then(() => { reader = true; });
      await flush();
      expect(reader, 'reader while writer holds').toBe(false);
      (await wp)(); await flush();
      expect(reader).toBe(true);
    },
  },
  {
    group: G4,
    title: 'a waiting writer blocks new readers (writer preference)',
    async run({ RWLock }, { expect, flush }) {
      const l = new RWLock();
      const r1 = await l.readLock();
      const order: string[] = [];
      l.writeLock().then((rel) => { order.push('writer'); rel(); });
      l.readLock().then(() => order.push('late reader'));
      await flush();
      expect(order, 'late reader must wait').toEqual([]);
      r1(); await flush();
      expect(order).toEqual(['writer', 'late reader']);
    },
  },
  {
    group: G4,
    title: 'readers queued together behind a writer are granted together',
    async run({ RWLock }, { expect, flush }) {
      const l = new RWLock();
      const w = await l.writeLock();
      let readers = 0, writer2 = false;
      l.readLock().then(() => readers++);
      l.readLock().then(() => readers++);
      l.writeLock().then(() => { writer2 = true; });
      w(); await flush();
      expect([readers, writer2]).toEqual([2, false]);
    },
  },
  {
    group: G4,
    title: 'runWrite sections never overlap with runRead sections',
    async run({ RWLock }, { expect, clock }) {
      const c = clock(); const l = new RWLock();
      let readers = 0, writers = 0, bad = false;
      const sleep = (ms: number) => new Promise<void>((r) => c.setTimeout(r, ms));
      const read = () => l.runRead(async () => { readers++; if (writers) bad = true; await sleep(5); readers--; });
      const write = () => l.runWrite(async () => { writers++; if (readers || writers > 1) bad = true; await sleep(5); writers--; });
      const all = Promise.all([read(), read(), write(), read(), write(), read()]);
      await c.runAll(); await all;
      expect(bad, 'overlap seen').toBe(false);
    },
  },
];
