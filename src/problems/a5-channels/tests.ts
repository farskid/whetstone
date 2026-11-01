import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Unbuffered channel';
const G2 = 'Buffered channel';
const G3 = 'Close and iterate';
const G4 = 'merge and select';

/** Track whether a promise has settled yet. */
function watch(p: Promise<unknown>) {
  const s = { settled: false, rejected: false, error: undefined as unknown };
  p.then(() => { s.settled = true; }, (e) => { s.settled = true; s.rejected = true; s.error = e; });
  return s;
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'unbuffered send waits for a receiver',
    async run({ Channel }, { expect, flush }) {
      const ch = new Channel<number>();
      const s = watch(ch.send(1));
      await flush();
      expect(s.settled, 'send settled with no receiver').toBe(false);
      expect(await ch.receive()).toEqual({ value: 1, done: false });
      await flush();
      expect(s.settled, 'send settled after receive').toBe(true);
    },
  },
  {
    group: G1,
    title: 'receive waits for a sender',
    async run({ Channel }, { expect, flush }) {
      const ch = new Channel<string>();
      const r = ch.receive();
      const w = watch(r);
      await flush();
      expect(w.settled, 'receive settled early').toBe(false);
      await ch.send('hi');
      expect(await r).toEqual({ value: 'hi', done: false });
    },
  },
  {
    group: G1,
    title: 'waiting senders and receivers are served FIFO',
    async run({ Channel }, { expect }) {
      const ch = new Channel<number>();
      ch.send(1); ch.send(2); ch.send(3);
      const got = [(await ch.receive()).value, (await ch.receive()).value, (await ch.receive()).value];
      expect(got, 'senders').toEqual([1, 2, 3]);
      const rs = [ch.receive(), ch.receive()];
      await ch.send(10); await ch.send(20);
      expect((await Promise.all(rs)).map((r) => r.value), 'receivers').toEqual([10, 20]);
    },
  },
  {
    group: G2,
    title: 'buffered send resolves at once until the buffer is full',
    input: 'capacity 2',
    async run({ Channel }, { expect, flush }) {
      const ch = new Channel<number>(2);
      const a = watch(ch.send(1)), b = watch(ch.send(2)), c = watch(ch.send(3));
      await flush();
      expect([a.settled, b.settled, c.settled]).toEqual([true, true, false]);
    },
  },
  {
    group: G2,
    title: 'receiving frees a slot for the oldest waiting sender',
    input: 'capacity 1; send 1, 2, 3',
    async run({ Channel }, { expect, flush }) {
      const ch = new Channel<number>(1);
      ch.send(1); const b = watch(ch.send(2)); const c = watch(ch.send(3));
      expect((await ch.receive()).value).toBe(1);
      await flush();
      expect([b.settled, c.settled], 'send(2), send(3) settled').toEqual([true, false]);
      expect((await ch.receive()).value).toBe(2);
      expect((await ch.receive()).value).toBe(3);
    },
  },
  {
    group: G2,
    title: 'order is preserved through buffer and waiting senders',
    async run({ Channel }, { expect }) {
      const ch = new Channel<number>(3);
      for (let i = 0; i < 8; i++) ch.send(i);
      const out: number[] = [];
      for (let i = 0; i < 8; i++) out.push((await ch.receive()).value!);
      expect(out).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    },
  },
  {
    group: G3,
    title: 'close: buffered values still come out, then done',
    async run({ Channel }, { expect }) {
      const ch = new Channel<number>(5);
      await ch.send(1); await ch.send(2);
      ch.close();
      expect(ch.closed).toBe(true);
      expect(await ch.receive()).toEqual({ value: 1, done: false });
      expect(await ch.receive()).toEqual({ value: 2, done: false });
      expect(await ch.receive()).toEqual({ value: undefined, done: true });
      expect(await ch.receive(), 'again').toEqual({ value: undefined, done: true });
    },
  },
  {
    group: G3,
    title: 'close wakes waiting receivers with done',
    async run({ Channel }, { expect }) {
      const ch = new Channel<number>();
      const r = [ch.receive(), ch.receive()];
      ch.close();
      expect(await Promise.all(r)).toEqual([{ value: undefined, done: true }, { value: undefined, done: true }]);
    },
  },
  {
    group: G3,
    title: 'send after close and blocked senders reject with "Channel closed"',
    async run({ Channel }, { expect }) {
      const ch = new Channel<number>();
      const blocked = ch.send(1);
      blocked.catch(() => {});
      ch.close(); ch.close();
      await expect(blocked).toReject('Channel closed');
      await expect(ch.send(2)).toReject('Channel closed');
    },
  },
  {
    group: G3,
    title: 'for await yields every value until closed',
    async run({ Channel }, { expect }) {
      const ch = new Channel<number>(1);
      (async () => { for (const v of [1, 2, 3, 4]) await ch.send(v); ch.close(); })();
      const out: number[] = [];
      for await (const v of ch) out.push(v);
      expect(out).toEqual([1, 2, 3, 4]);
    },
  },
  {
    group: G3,
    title: 'breaking out of for await does not lose the next value',
    async run({ Channel }, { expect }) {
      const ch = new Channel<number>(5);
      for (const v of [1, 2, 3]) await ch.send(v);
      for await (const v of ch) { if (v === 1) break; }
      expect(await ch.receive()).toEqual({ value: 2, done: false });
    },
  },
  {
    group: G4,
    title: 'merge delivers every value, in order per input, then closes',
    async run({ Channel, merge }, { expect }) {
      const a = new Channel<string>(), b = new Channel<string>();
      const m = merge(a, b);
      (async () => { for (const v of ['a1', 'a2', 'a3']) await a.send(v); a.close(); })();
      (async () => { for (const v of ['b1', 'b2']) await b.send(v); b.close(); })();
      const out: string[] = [];
      for await (const v of m) out.push(v);
      expect(out.length, 'count').toBe(5);
      expect(out.filter((v) => v[0] === 'a'), 'a order').toEqual(['a1', 'a2', 'a3']);
      expect(out.filter((v) => v[0] === 'b'), 'b order').toEqual(['b1', 'b2']);
    },
  },
  {
    group: G4,
    title: 'select picks the lowest ready index without touching the others',
    async run({ Channel, select }, { expect }) {
      const a = new Channel<string>(1), b = new Channel<string>(1), c = new Channel<string>(1);
      await b.send('B'); await c.send('C');
      expect(await select([a, b, c])).toEqual({ index: 1, value: 'B', done: false });
      expect(await c.receive(), 'c still has its value').toEqual({ value: 'C', done: false });
    },
  },
  {
    group: G4,
    title: 'select waits, and losing channels keep their later values',
    async run({ Channel, select }, { expect, flush }) {
      const a = new Channel<number>(), b = new Channel<number>();
      const sel = select([a, b]);
      await b.send(2);
      expect(await sel).toEqual({ index: 1, value: 2, done: false });
      const sent = watch(a.send(1));
      await flush();
      expect(sent.settled, 'a.send taken by the finished select').toBe(false);
      expect(await a.receive()).toEqual({ value: 1, done: false });
    },
  },
  {
    group: G4,
    title: 'select reports a closed channel as done',
    async run({ Channel, select }, { expect }) {
      const a = new Channel<number>(), b = new Channel<number>();
      const sel = select([a, b]);
      a.close();
      expect(await sel).toEqual({ index: 0, value: undefined, done: true });
    },
  },
];
