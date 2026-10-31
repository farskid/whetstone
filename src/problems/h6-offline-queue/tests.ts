import type { TestCase, Deferred } from '../../runner/types';
type M = typeof import('./solution');
type Mutation = import('./solution').Mutation;

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { data, getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => { data[k] = v; } };
};

/** send() that you settle by hand. */
function manualSend(deferred: <T>() => Deferred<T>) {
  const calls: { m: Mutation; d: Deferred<unknown> }[] = [];
  const send = (m: Mutation) => { const d = deferred<unknown>(); calls.push({ m, d }); return d.promise; };
  return { calls, send, sent: () => calls.map((c) => `${c.m.id}:${JSON.stringify(c.m.payload)}`) };
}

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

export const tests: TestCase<M>[] = [
  {
    title: 'online: sends one at a time in FIFO order',
    async run({ createOfflineQueue }, { expect, deferred, flush }) {
      const s = manualSend(deferred);
      const q = createOfflineQueue({ send: s.send, storage: memoryStorage() });
      expect([q.enqueue('a', 1), q.enqueue('b', 2), q.enqueue('c', 3)]).toEqual([1, 2, 3]);
      expect(s.calls.length, 'never sends synchronously inside enqueue').toBe(0);
      await flush();
      expect(s.sent()).toEqual(['1:1']);
      s.calls[0].d.resolve('ok');
      await flush();
      expect(s.sent()).toEqual(['1:1', '2:2']);
      s.calls[1].d.resolve('ok');
      await flush();
      s.calls[2].d.resolve('ok');
      await flush();
      expect(s.sent()).toEqual(['1:1', '2:2', '3:3']);
      expect(q.pending()).toEqual([]);
    },
  },
  {
    title: 'offline: nothing is sent until setOnline(true), then order is kept',
    async run({ createOfflineQueue }, { expect, flush }) {
      const sent: string[] = [];
      const q = createOfflineQueue({ send: async (m) => { sent.push(m.type); }, storage: memoryStorage(), online: false });
      q.enqueue('a', null);
      q.enqueue('b', null);
      await flush();
      expect(sent).toEqual([]);
      expect(q.pending().map((m) => m.type)).toEqual(['a', 'b']);
      q.setOnline(true);
      await flush();
      expect(sent).toEqual(['a', 'b']);
    },
  },
  {
    title: 'pending() returns copies, including the in-flight mutation',
    async run({ createOfflineQueue }, { expect, deferred, flush }) {
      const s = manualSend(deferred);
      const q = createOfflineQueue({ send: s.send, storage: memoryStorage() });
      q.enqueue('a', { x: 1 }, { dedupeKey: 'k' });
      await flush();
      const p = q.pending();
      expect(p).toEqual([{ id: 1, type: 'a', payload: { x: 1 }, dedupeKey: 'k', attempts: 0 }]);
      p[0].type = 'hacked';
      expect(q.pending()[0].type).toBe('a');
    },
  },
  {
    title: 'persists after every change and restores on startup',
    input: 'queue offline, "reload", come online',
    async run({ createOfflineQueue }, { expect, flush }) {
      const storage = memoryStorage();
      const q1 = createOfflineQueue({ send: async () => {}, storage, online: false });
      q1.enqueue('a', 1);
      q1.enqueue('b', 2);
      expect(JSON.parse(storage.data['offline-queue']).map((m: Mutation) => m.type)).toEqual(['a', 'b']);
      const sent: string[] = [];
      const q2 = createOfflineQueue({ send: async (m) => { sent.push(`${m.id}${m.type}`); }, storage, online: false });
      expect(q2.pending().map((m) => m.id)).toEqual([1, 2]);
      expect(q2.enqueue('c', 3), 'ids continue after the restored ones').toBe(3);
      q2.setOnline(true);
      await flush();
      expect(sent).toEqual(['1a', '2b', '3c']);
      expect(storage.data['offline-queue']).toBe('[]');
    },
  },
  {
    title: 'restored queue is sent at startup when online; custom storageKey',
    async run({ createOfflineQueue }, { expect, flush }) {
      const storage = memoryStorage({ q: JSON.stringify([{ id: 41, type: 'x', payload: 'p', attempts: 1 }]) });
      const sent: Mutation[] = [];
      const q = createOfflineQueue({ send: async (m) => { sent.push(m); }, storage, storageKey: 'q' });
      await flush();
      expect(sent).toEqual([{ id: 41, type: 'x', payload: 'p', attempts: 1 }]);
      expect(q.enqueue('y', 0)).toBe(42);
    },
  },
  {
    title: 'retryable failure: backs off on the clock and blocks the queue',
    input: 'default delays 1000, 2000',
    async run({ createOfflineQueue }, { expect, deferred, flush, clock }) {
      const clk = clock();
      const s = manualSend(deferred);
      const q = createOfflineQueue({ send: s.send, storage: memoryStorage(), clock: clk });
      q.enqueue('a', 1);
      q.enqueue('b', 2);
      await flush();
      s.calls[0].d.reject(httpError(503));
      await flush();
      expect(q.pending()[0].attempts).toBe(1);
      await clk.advance(999);
      expect(s.sent(), 'b must wait behind a').toEqual(['1:1']);
      await clk.advance(1);
      expect(s.sent()).toEqual(['1:1', '1:1']);
      s.calls[1].d.reject(new TypeError('Failed to fetch'));
      await flush();
      await clk.advance(1999);
      expect(s.calls.length).toBe(2);
      await clk.advance(1);
      expect(s.calls.length).toBe(3);
      s.calls[2].d.resolve('ok');
      await flush();
      expect(s.sent()).toEqual(['1:1', '1:1', '1:1', '2:2']);
    },
  },
  {
    title: 'non-retryable (4xx) errors drop immediately; onSettled reports outcomes',
    async run({ createOfflineQueue }, { expect, flush }) {
      const settled: string[] = [];
      const q = createOfflineQueue({
        send: async (m) => { if (m.type === 'bad') throw httpError(422); return `saved ${m.type}`; },
        storage: memoryStorage(),
        onSettled: (m, o) => settled.push(`${m.type} ${o.ok ? o.value : (o.error as Error).message}`),
      });
      q.enqueue('bad', 0);
      q.enqueue('good', 0);
      await flush();
      expect(settled).toEqual(['bad HTTP 422', 'good saved good']);
    },
  },
  {
    title: 'maxRetries: dropped after attempts exceed it',
    input: 'maxRetries 2, retryDelay 10 → 3 sends total',
    async run({ createOfflineQueue }, { expect, clock }) {
      const clk = clock();
      let sends = 0;
      const outcomes: unknown[] = [];
      const q = createOfflineQueue({
        send: async () => { sends++; throw new Error(`fail ${sends}`); },
        storage: memoryStorage(), maxRetries: 2, retryDelay: () => 10, clock: clk,
        onSettled: (m, o) => outcomes.push([m.attempts, o.ok, (o as { error: Error }).error.message]),
      });
      q.enqueue('x', 0);
      await clk.advance(100);
      expect(sends).toBe(3);
      expect(outcomes).toEqual([[3, false, 'fail 3']]);
      expect(q.pending()).toEqual([]);
    },
  },
  {
    title: 'attempts are persisted, so a reload does not reset the retry budget',
    async run({ createOfflineQueue }, { expect, flush, clock }) {
      const storage = memoryStorage();
      createOfflineQueue({ send: async () => { throw new Error('x'); }, storage, clock: clock() }).enqueue('a', 0);
      await flush();
      expect(JSON.parse(storage.data['offline-queue'])[0].attempts).toBe(1);
    },
  },
  {
    title: 'going offline cancels a pending retry; online resends right away',
    async run({ createOfflineQueue }, { expect, deferred, flush, clock }) {
      const clk = clock();
      const s = manualSend(deferred);
      const q = createOfflineQueue({ send: s.send, storage: memoryStorage(), clock: clk });
      q.enqueue('a', 1);
      await flush();
      s.calls[0].d.reject(new Error('flaky'));
      await flush();
      q.setOnline(false);
      expect(clk.pendingTimers(), 'retry timer cleared').toBe(0);
      await clk.advance(60_000);
      expect(s.calls.length).toBe(1);
      q.setOnline(true);
      await flush();
      expect(s.calls.length, 'no need to wait for the old delay').toBe(2);
      expect(s.calls[1].m.attempts).toBe(1);
    },
  },
  {
    title: 'a send in flight when going offline: failure waits for online, no timer',
    async run({ createOfflineQueue }, { expect, deferred, flush, clock }) {
      const clk = clock();
      const s = manualSend(deferred);
      const q = createOfflineQueue({ send: s.send, storage: memoryStorage(), clock: clk });
      q.enqueue('a', 1);
      q.enqueue('b', 2);
      await flush();
      q.setOnline(false);
      s.calls[0].d.resolve('ok');
      await flush();
      expect(s.calls.length, 'b is not sent while offline').toBe(1);
      q.setOnline(true);
      await flush();
      expect(s.calls.length).toBe(2);
      q.setOnline(false);
      s.calls[1].d.reject(new Error('lost'));
      await flush();
      expect(clk.pendingTimers()).toBe(0);
      q.setOnline(true);
      await flush();
      expect(s.sent()).toEqual(['1:1', '2:2', '2:2']);
    },
  },
  {
    title: 'coalescing: dedupeKey replaces a queued payload in place',
    async run({ createOfflineQueue }, { expect, flush }) {
      const sent: string[] = [];
      const q = createOfflineQueue({ send: async (m) => { sent.push(`${m.id}:${m.payload}`); }, storage: memoryStorage(), online: false });
      expect(q.enqueue('note.update', 'v1', { dedupeKey: 'note:7' })).toBe(1);
      q.enqueue('other', 'x');
      expect(q.enqueue('note.update', 'v2', { dedupeKey: 'note:7' })).toBe(1);
      expect(q.enqueue('note.update', 'v3', { dedupeKey: 'note:7' })).toBe(1);
      q.enqueue('note.update', 'n8', { dedupeKey: 'note:8' });
      q.setOnline(true);
      await flush();
      expect(sent).toEqual(['1:v3', '2:x', '3:n8']);
    },
  },
  {
    title: 'coalescing never touches the in-flight mutation',
    async run({ createOfflineQueue }, { expect, deferred, flush }) {
      const s = manualSend(deferred);
      const q = createOfflineQueue({ send: s.send, storage: memoryStorage() });
      q.enqueue('save', 'v1', { dedupeKey: 'doc' });
      await flush();
      expect(q.enqueue('save', 'v2', { dedupeKey: 'doc' }), 'v1 in flight → new entry').toBe(2);
      expect(q.enqueue('save', 'v3', { dedupeKey: 'doc' }), 'coalesces into the queued v2').toBe(2);
      expect(s.calls[0].m.payload).toBe('v1');
      s.calls[0].d.resolve(null);
      await flush();
      expect(s.sent()).toEqual(['1:"v1"', '2:"v3"']);
    },
  },
  {
    title: 'coalescing keeps attempts and persists the new payload',
    async run({ createOfflineQueue }, { expect, flush, clock }) {
      const clk = clock();
      const storage = memoryStorage();
      let fail = true;
      const sent: unknown[] = [];
      const q = createOfflineQueue({ send: async (m) => { sent.push([m.payload, m.attempts]); if (fail) throw new Error('x'); }, storage, clock: clk, retryDelay: () => 100 });
      q.enqueue('save', 'v1', { dedupeKey: 'doc' });
      await flush();
      q.enqueue('save', 'v2', { dedupeKey: 'doc' });
      expect(JSON.parse(storage.data['offline-queue'])[0]).toEqual({ id: 1, type: 'save', payload: 'v2', dedupeKey: 'doc', attempts: 1 });
      fail = false;
      await clk.advance(100);
      expect(sent).toEqual([['v1', 0], ['v2', 1]]);
    },
  },
  {
    title: 'a send that throws synchronously is treated as a failure',
    async run({ createOfflineQueue }, { expect, clock }) {
      const clk = clock();
      let n = 0;
      const q = createOfflineQueue({ send: (() => { n++; if (n === 1) throw new Error('sync'); return Promise.resolve(); }) as never, storage: memoryStorage(), clock: clk, retryDelay: () => 5 });
      q.enqueue('a', 0);
      await clk.advance(5);
      expect(n).toBe(2);
      expect(q.pending()).toEqual([]);
    },
  },
];
