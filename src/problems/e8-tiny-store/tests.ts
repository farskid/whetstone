import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Store';
const G2 = 'Selectors';
const G3 = 'Persist';
const G4 = 'Races and tabs';

function memoryStorage(initial: Record<string, string> = {}, opts: { async?: boolean } = {}) {
  const data: Record<string, string> = { ...initial };
  const writes: string[] = [];
  return {
    data,
    writes,
    getItem: (k: string) => (opts.async ? Promise.resolve(data[k] ?? null) : data[k] ?? null),
    setItem: (k: string, v: string) => { data[k] = v; writes.push(v); },
    removeItem: (k: string) => { delete data[k]; },
  };
}

function makeBus() {
  const handlers: { owner: number; fn: (m: { name: string; value: string }) => void }[] = [];
  let ids = 0;
  const posted: string[] = [];
  return {
    posted,
    tab() {
      const me = ++ids;
      return {
        postMessage(m: { name: string; value: string }) { posted.push(`${me}:${m.value}`); for (const h of handlers) if (h.owner !== me) h.fn(m); },
        subscribe(fn: (m: { name: string; value: string }) => void) { const h = { owner: me, fn }; handlers.push(h); return () => handlers.splice(handlers.indexOf(h), 1); },
      };
    },
  };
}

type Counter = { count: number; label: string; inc: () => void };
const counterInit = (set: any): Counter => ({ count: 0, label: 'x', inc: () => set((s: Counter) => ({ count: s.count + 1 })) });

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'set merges into a new object; replace swaps it; actions use set',
    run({ create }, { expect }) {
      const api = create<Counter>(counterInit);
      const s0 = api.getState();
      s0.inc();
      const s1 = api.getState();
      expect([s1.count, s1.label, s1 !== s0, s0.count]).toEqual([1, 'x', true, 0]);
      api.setState({ label: 'y' });
      expect(api.getState().inc).toBe(s0.inc);
      api.setState({ count: 5 } as Counter, true);
      expect(api.getState()).toEqual({ count: 5 });
    },
  },
  {
    group: G1,
    title: 'listeners get (state, prev); identical results do not notify',
    run({ create }, { expect }) {
      const api = create<Counter>(counterInit);
      const calls: [number, number][] = [];
      const un = api.subscribe((s, p) => calls.push([s.count, p.count]));
      api.getState().inc();
      api.setState((s) => s);
      api.setState({ count: 7 });
      un();
      api.setState({ count: 8 });
      expect(calls).toEqual([[1, 0], [7, 1]]);
    },
  },
  {
    group: G2,
    title: 'selector subscriptions fire only when the slice changes',
    run({ create }, { expect }) {
      const api = create<Counter>(counterInit);
      const seen: unknown[] = [];
      api.subscribe((s) => s.count, (c, p) => seen.push([c, p]));
      api.setState({ label: 'other' });
      api.getState().inc();
      api.getState().inc();
      expect(seen).toEqual([[1, 0], [2, 1]]);
    },
  },
  {
    group: G2,
    title: 'equalityFn and fireImmediately',
    run({ create }, { expect }) {
      const api = create(() => ({ items: [1, 2], other: 0 }));
      const shallow = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
      const seen: unknown[] = [];
      api.subscribe((s) => s.items.filter((x) => x > 1), (v) => seen.push(v), { equalityFn: shallow, fireImmediately: true });
      api.setState({ other: 1 });
      api.setState({ items: [1, 2] });
      api.setState({ items: [2, 3] });
      expect(seen).toEqual([[2], [2, 3]]);
    },
  },
  {
    group: G3,
    title: 'hydration is async even with sync storage, then merges and notifies',
    async run({ create, persist }, { expect, flush }) {
      const storage = memoryStorage({ counter: JSON.stringify({ state: { count: 41 }, version: 0 }) });
      const hydratedWith: unknown[] = [];
      const api = create<Counter>(persist(counterInit, { name: 'counter', storage, onHydrated: (s, e) => hydratedWith.push([s.count, e]) }));
      expect([api.getState().count, api.persist!.hasHydrated()]).toEqual([0, false]);
      await api.persist!.whenHydrated();
      expect([api.getState().count, api.getState().label, typeof api.getState().inc, api.persist!.hasHydrated()]).toEqual([41, 'x', 'function', true]);
      expect(hydratedWith).toEqual([[41, undefined]]);
      expect(storage.writes, 'hydration alone does not write').toEqual([]);
      api.getState().inc();
      expect(JSON.parse(storage.data.counter)).toEqual({ state: { count: 42, label: 'x' }, version: 0 });
      await flush();
      await api.persist!.whenHydrated();
    },
  },
  {
    group: G3,
    title: 'partialize, custom merge and clearStorage',
    async run({ create, persist }, { expect }) {
      const storage = memoryStorage({ prefs: JSON.stringify({ state: { theme: 'dark', nested: { a: 1 } }, version: 0 }) });
      const api = create(persist(() => ({ theme: 'light', nested: { a: 0, b: 2 }, session: 'tmp' }), {
        name: 'prefs',
        storage,
        partialize: (s) => ({ theme: s.theme, nested: s.nested }),
        merge: (p, c) => ({ ...c, ...p, nested: { ...c.nested, ...p.nested } }),
      }));
      await api.persist!.whenHydrated();
      expect(api.getState()).toEqual({ theme: 'dark', nested: { a: 1, b: 2 }, session: 'tmp' });
      api.setState({ session: 'changed' });
      expect(JSON.parse(storage.data.prefs).state).toEqual({ theme: 'dark', nested: { a: 1, b: 2 } });
      await api.persist!.clearStorage();
      expect(storage.data.prefs).toBe(undefined);
    },
  },
  {
    group: G3,
    title: 'versions: migrate old state, or ignore it without migrate',
    async run({ create, persist }, { expect }) {
      const stored = { s: JSON.stringify({ state: { cnt: 3 }, version: 1 }) };
      const migrated: unknown[] = [];
      const a = create(persist(() => ({ count: 0 }), {
        name: 's', storage: memoryStorage(stored), version: 2,
        migrate: async (p, v) => { migrated.push(v); return { count: p.cnt * 10 }; },
      }));
      await a.persist!.whenHydrated();
      expect([a.getState(), migrated]).toEqual([{ count: 30 }, [1]]);
      const b = create(persist(() => ({ count: 0 }), { name: 's', storage: memoryStorage(stored), version: 2 }));
      await b.persist!.whenHydrated();
      expect(b.getState()).toEqual({ count: 0 });
    },
  },
  {
    group: G3,
    title: 'corrupt storage falls back to the current state',
    async run({ create, persist }, { expect }) {
      for (const raw of ['{not json', '"just a string"', 'null']) {
        const errors: unknown[] = [];
        const storage = memoryStorage({ k: raw });
        const api = create(persist(() => ({ n: 1 }), { name: 'k', storage, onHydrated: (_s, e) => errors.push(e) }));
        await api.persist!.whenHydrated();
        expect([api.getState(), api.persist!.hasHydrated(), errors.length, errors[0] instanceof Error], raw).toEqual([{ n: 1 }, true, 1, true]);
        api.setState({ n: 2 });
        expect(JSON.parse(storage.data.k).state, 'writes work after a failed hydration').toEqual({ n: 2 });
      }
    },
  },
  {
    group: G4,
    title: 'keys set before hydration finishes win, and are written once afterwards',
    async run({ create, persist }, { expect, deferred }) {
      const d = deferred<string | null>();
      const writes: string[] = [];
      const storage = { getItem: () => d.promise, setItem: (_k: string, v: string) => { writes.push(v); }, removeItem: () => {} };
      const api = create(persist(() => ({ a: 0, b: 0, c: 0 }), { name: 'race', storage }));
      api.setState({ a: 100 });
      api.setState({ c: 5 });
      api.setState({ c: 0 });
      expect(writes, 'no writes before hydration').toEqual([]);
      d.resolve(JSON.stringify({ state: { a: 1, b: 2, c: 3 }, version: 0 }));
      await api.persist!.whenHydrated();
      expect(api.getState(), 'changed keys win, even if changed back').toEqual({ a: 100, b: 2, c: 0 });
      expect(writes.map((w) => JSON.parse(w).state)).toEqual([{ a: 100, b: 2, c: 0 }]);
    },
  },
  {
    group: G4,
    title: 'rehydrate discards an earlier in-flight hydration',
    async run({ create, persist }, { expect, deferred, flush }) {
      const reads = [deferred<string | null>(), deferred<string | null>()];
      let i = 0;
      const storage = { getItem: () => reads[i++].promise, setItem: () => {}, removeItem: () => {} };
      const api = create(persist(() => ({ v: 'init' }), { name: 'x', storage }));
      await flush();
      const again = api.persist!.rehydrate();
      reads[1].resolve(JSON.stringify({ state: { v: 'new' }, version: 0 }));
      await again;
      reads[0].resolve(JSON.stringify({ state: { v: 'old' }, version: 0 }));
      await flush();
      expect(api.getState().v).toBe('new');
    },
  },
  {
    group: G4,
    title: 'cross-tab sync applies remote state without echo',
    async run({ create, persist }, { expect }) {
      const bus = makeBus();
      const storage = memoryStorage({}, { async: true });
      const tabA = create<Counter>(persist(counterInit, { name: 'c', storage, bus: bus.tab() }));
      const tabB = create<Counter>(persist(counterInit, { name: 'c', storage, bus: bus.tab() }));
      const other = create(persist(() => ({ count: 0 }), { name: 'unrelated', storage, bus: bus.tab() }));
      await Promise.all([tabA.persist!.whenHydrated(), tabB.persist!.whenHydrated(), other.persist!.whenHydrated()]);
      const bSeen: number[] = [];
      tabB.subscribe((s) => bSeen.push(s.count));
      tabA.getState().inc();
      tabA.getState().inc();
      expect([tabB.getState().count, bSeen, other.getState().count]).toEqual([2, [1, 2], 0]);
      expect([bus.posted.length, storage.writes.length], 'tab B neither wrote nor re-posted').toEqual([2, 2]);
      tabB.getState().inc();
      expect([tabA.getState().count, bus.posted.length]).toEqual([3, 3]);
    },
  },
];
