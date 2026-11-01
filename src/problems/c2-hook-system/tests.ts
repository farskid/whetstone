import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'SyncHook';
const G2 = 'Waterfall and bail';
const G3 = 'Async hooks';
const G4 = 'Ordering and interceptors';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'taps run in registration order with the call arguments',
    run({ SyncHook }, { expect }) {
      const h = new SyncHook<[string, number]>();
      const log: string[] = [];
      h.call('nobody', 0);
      h.tap('A', (s, n) => { log.push(`A ${s} ${n}`); });
      h.tap({ name: 'B' }, (s, n) => { log.push(`B ${s} ${n}`); });
      expect(h.call('x', 1)).toBeUndefined();
      expect(log).toEqual(['A x 1', 'B x 1']);
    },
  },
  {
    group: G1,
    title: 'a name is required; a throwing tap propagates',
    run({ SyncHook }, { expect }) {
      const h = new SyncHook();
      expect(() => h.tap('', () => {})).toThrow();
      expect(() => h.tap({} as any, () => {})).toThrow();
      h.tap('bad', () => { throw new Error('tap failed'); });
      expect(() => h.call()).toThrow('tap failed');
    },
  },
  {
    group: G1,
    title: 'taps added during a call run only from the next call',
    run({ SyncHook }, { expect }) {
      const h = new SyncHook();
      const log: string[] = [];
      h.tap('adder', () => { log.push('adder'); if (log.length === 1) h.tap('late', () => { log.push('late'); }); });
      h.call();
      expect(log).toEqual(['adder']);
      h.call();
      expect(log).toEqual(['adder', 'adder', 'late']);
    },
  },
  {
    group: G2,
    title: 'waterfall: values flow; undefined keeps the previous; other args pass through',
    run({ SyncWaterfallHook }, { expect }) {
      const h = new SyncWaterfallHook<[string, string]>();
      expect(h.call('start', 'f'), 'no taps').toBe('start');
      const seen: string[] = [];
      h.tap('A', (v, f) => { seen.push(`${v}|${f}`); return v + 'A'; });
      h.tap('noop', (v, f) => { seen.push(`${v}|${f}`); return undefined; });
      h.tap('B', (v, f) => { seen.push(`${v}|${f}`); return v + 'B'; });
      h.tap('empty', () => '' );
      expect(h.call('x', 'file.js')).toBe('');
      expect(seen).toEqual(['x|file.js', 'xA|file.js', 'xA|file.js']);
    },
  },
  {
    group: G2,
    title: 'bail: the first non-undefined return wins (null, 0 and false bail too)',
    run({ SyncBailHook }, { expect }) {
      const h = new SyncBailHook<[number], unknown>();
      const log: string[] = [];
      h.tap('skip', (n) => { log.push('skip'); return undefined; });
      h.tap('zero', (n) => { log.push('zero'); return n === 0 ? 0 : n === 1 ? null : n === 2 ? false : undefined; });
      h.tap('last', () => { log.push('last'); return 'last'; });
      expect(h.call(0)).toBe(0);
      expect(h.call(1)).toBeNull();
      expect(h.call(2)).toBe(false);
      expect(log).toEqual(['skip', 'zero', 'skip', 'zero', 'skip', 'zero']);
      expect(h.call(3)).toBe('last');
      const none = new SyncBailHook<[], string>();
      none.tap('a', () => undefined as any);
      expect(none.call()).toBeUndefined();
    },
  },
  {
    group: G3,
    title: 'AsyncSeriesHook runs taps one at a time, mixing tap and tapPromise',
    async run({ AsyncSeriesHook }, { expect, deferred, flush }) {
      const h = new AsyncSeriesHook<[string]>();
      const log: string[] = [];
      const d1 = deferred<void>();
      h.tapPromise('first', (x) => { log.push('first start ' + x); return d1.promise.then(() => { log.push('first end'); }); });
      h.tap('sync', (x) => { log.push('sync ' + x); });
      h.tapPromise('third', async () => { log.push('third'); });
      const p = h.promise('go');
      await flush();
      expect(log).toEqual(['first start go']);
      d1.resolve();
      await p;
      expect(log).toEqual(['first start go', 'first end', 'sync go', 'third']);
    },
  },
  {
    group: G3,
    title: 'AsyncSeriesHook stops at the first rejection or throw',
    async run({ AsyncSeriesHook }, { expect }) {
      const h = new AsyncSeriesHook();
      const log: string[] = [];
      h.tap('a', () => { log.push('a'); });
      h.tapPromise('b', async () => { log.push('b'); throw new Error('b failed'); });
      h.tap('c', () => { log.push('c'); });
      await expect(h.promise()).toReject('b failed');
      expect(log).toEqual(['a', 'b']);
      const s = new AsyncSeriesHook();
      s.tap('sync-throw', () => { throw new Error('sync failed'); });
      await expect(s.promise()).toReject('sync failed');
      const np = new AsyncSeriesHook();
      np.tapPromise('not-a-promise', (() => 42) as any);
      await expect(np.promise()).toReject();
    },
  },
  {
    group: G3,
    title: 'AsyncParallelHook starts every tap at once and waits for all',
    async run({ AsyncParallelHook }, { expect, deferred, flush }) {
      const h = new AsyncParallelHook<[number]>();
      const log: string[] = [];
      const ds = [deferred<void>(), deferred<void>()];
      h.tapPromise('a', (n) => { log.push('a ' + n); return ds[0].promise; });
      h.tapPromise('b', (n) => { log.push('b ' + n); return ds[1].promise; });
      h.tap('c', (n) => { log.push('c ' + n); });
      let done = false;
      const p = h.promise(7).then(() => { done = true; });
      expect(log, 'all started synchronously').toEqual(['a 7', 'b 7', 'c 7']);
      ds[1].resolve();
      await flush();
      expect(done).toBe(false);
      ds[0].resolve();
      await p;
      expect(done).toBe(true);
    },
  },
  {
    group: G3,
    title: 'AsyncParallelHook rejects as soon as one tap rejects',
    async run({ AsyncParallelHook }, { expect, deferred }) {
      const h = new AsyncParallelHook();
      const slow = deferred<void>();
      h.tapPromise('slow', () => slow.promise);
      h.tapPromise('fails', () => Promise.reject(new Error('parallel failed')));
      await expect(h.promise()).toReject('parallel failed');
      slow.resolve();
      const t = new AsyncParallelHook();
      t.tap('throws', () => { throw new Error('sync throw'); });
      await expect(t.promise()).toReject('sync throw');
    },
  },
  {
    group: G4,
    title: 'stage orders taps; equal stages keep registration order',
    run({ SyncHook }, { expect }) {
      const h = new SyncHook();
      const log: string[] = [];
      const add = (name: string, stage?: number) => h.tap(stage === undefined ? name : { name, stage }, () => { log.push(name); });
      add('zero1'); add('late', 10); add('early', -5); add('zero2', 0); add('late2', 10); add('mid', 5);
      h.call();
      expect(log).toEqual(['early', 'zero1', 'zero2', 'mid', 'late', 'late2']);
    },
  },
  {
    group: G4,
    title: 'before places a tap ahead of named taps; unknown names are ignored',
    run({ SyncHook }, { expect }) {
      const h = new SyncHook();
      const log: string[] = [];
      const add = (o: any) => h.tap(o, () => { log.push(typeof o === 'string' ? o : o.name); });
      add('A'); add('B'); add('C');
      add({ name: 'beforeB', before: 'B' });
      add({ name: 'beforeCorA', before: ['C', 'A'] });
      add({ name: 'ghost', before: 'nobody' });
      add({ name: 'beforeLate', before: 'late', stage: 0 });
      add({ name: 'late', stage: 10 });
      h.call();
      expect(log).toEqual(['beforeCorA', 'A', 'beforeB', 'B', 'C', 'ghost', 'beforeLate', 'late']);
    },
  },
  {
    group: G4,
    title: 'interceptors see each call and each tap, in order',
    async run({ SyncHook, AsyncSeriesHook }, { expect }) {
      const h = new SyncHook<[number]>();
      const log: string[] = [];
      h.tap('A', () => { log.push('run A'); });
      h.intercept({ call: (n) => log.push('call1 ' + n), tap: (t) => log.push(`tap1 ${t.name}/${t.type}/${t.stage}`) });
      h.tap({ name: 'B', stage: 2 }, () => { log.push('run B'); });
      h.intercept({ call: () => log.push('call2') });
      h.call(5);
      expect(log).toEqual(['call1 5', 'call2', 'tap1 A/sync/0', 'run A', 'tap1 B/sync/2', 'run B']);
      const a = new AsyncSeriesHook<[string]>();
      const alog: string[] = [];
      a.intercept({ call: (x) => alog.push('call ' + x), tap: (t) => alog.push(`tap ${t.name}/${t.type}`) });
      a.tapPromise('P', async () => { alog.push('run P'); });
      a.tap('S', () => { alog.push('run S'); });
      await a.promise('go');
      expect(alog).toEqual(['call go', 'tap P/promise', 'run P', 'tap S/sync', 'run S']);
    },
  },
];
