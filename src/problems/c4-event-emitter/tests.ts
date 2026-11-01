import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'on/off/emit';
const G2 = 'once and prepend';
const G3 = 'Typed and wildcard';
const G4 = 'Node semantics';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'emit calls listeners in order and reports whether any ran',
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      const log: string[] = [];
      expect(em.emit('x', 1)).toBe(false);
      em.on('x', (a: number, b: number) => log.push(`one ${a} ${b}`)).on('x', (a: number) => log.push(`two ${a}`));
      expect(em.emit('x', 1, 2)).toBe(true);
      expect(log).toEqual(['one 1 2', 'two 1']);
    },
  },
  {
    group: G1,
    title: 'same fn twice runs twice; off removes the most recent one; unknown off is a no-op',
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      const log: string[] = [];
      const f = (tag: string) => log.push('f ' + tag);
      const g = (tag: string) => log.push('g ' + tag);
      em.on('e', f); em.on('e', g); em.on('e', f);
      em.emit('e', 'a');
      em.off('e', f);
      em.emit('e', 'b');
      em.off('e', () => {}).off('nope', f);
      em.off('e', f); em.off('e', g);
      expect(em.emit('e', 'c')).toBe(false);
      expect(log).toEqual(['f a', 'g a', 'f a', 'f b', 'g b']);
      expect(em.listenerCount('e')).toBe(0);
    },
  },
  {
    group: G1,
    title: 'snapshot: listeners added or removed mid-emit take effect next time',
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      const log: string[] = [];
      const b = () => log.push('b');
      const late = () => log.push('late');
      em.on('e', () => { log.push('a'); em.off('e', b); em.on('e', late); });
      em.on('e', b);
      em.emit('e');
      expect(log, 'b still runs, late does not').toEqual(['a', 'b']);
      log.length = 0;
      em.emit('e');
      expect(log).toEqual(['a', 'late']);
    },
  },
  {
    group: G2,
    title: 'once runs a single time, even when emitting from inside itself',
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      let n = 0;
      em.once('tick', () => { n++; em.emit('tick'); });
      expect(em.listenerCount('tick')).toBe(1);
      expect(em.emit('tick')).toBe(true);
      expect(em.emit('tick')).toBe(false);
      expect(n).toBe(1);
      expect(em.listenerCount('tick')).toBe(0);
    },
  },
  {
    group: G2,
    title: 'off with the original fn removes a pending once listener',
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      let calls = 0;
      const f = () => calls++;
      em.once('x', f);
      em.off('x', f);
      expect(em.emit('x')).toBe(false);
      em.on('x', f);
      em.once('x', f);
      em.emit('x');
      em.emit('x');
      expect(calls, 'on runs twice, once runs once').toBe(3);
    },
  },
  {
    group: G2,
    title: 'prependListener goes first; listenerCount counts every registration',
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      const log: string[] = [];
      em.on('e', () => log.push('on'));
      em.prependListener('e', () => log.push('first'));
      em.once('e', () => log.push('once'));
      expect(em.listenerCount('e')).toBe(3);
      expect(em.listenerCount('other')).toBe(0);
      em.emit('e');
      expect(log).toEqual(['first', 'on', 'once']);
      expect(em.listenerCount('e')).toBe(2);
    },
  },
  {
    group: G3,
    title: 'wildcard listeners run after named ones with the event name',
    run({ Emitter }, { expect }) {
      type Ev = { a: [number]; b: [string, boolean] };
      const em = new Emitter<Ev>();
      const log: unknown[] = [];
      em.on('*', (name, ...args) => log.push(['*', name, ...args]));
      em.on('a', (n) => log.push(['a', n]));
      expect(em.emit('b', 'x', true), 'wildcard alone counts').toBe(true);
      em.emit('a', 1);
      expect(log).toEqual([['*', 'b', 'x', true], ['a', 1], ['*', 'a', 1]]);
      expect(em.listenerCount('a')).toBe(1);
      expect(em.listenerCount('*')).toBe(1);
    },
  },
  {
    group: G4,
    title: "emitting 'error' with no error listener throws",
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      em.on('*', () => {});
      expect(() => em.emit('error', new Error('kaboom'))).toThrow('kaboom');
      expect(() => em.emit('error', 'just text')).toThrow('Unhandled error. (just text)');
      const got: unknown[] = [];
      em.on('error', (e: unknown) => got.push(e));
      expect(em.emit('error', 'handled')).toBe(true);
      expect(got).toEqual(['handled']);
    },
  },
  {
    group: G4,
    title: 'a throwing listener stops the emit',
    run({ Emitter }, { expect }) {
      const em = new Emitter();
      const log: string[] = [];
      em.on('e', () => { throw new Error('listener failed'); });
      em.on('e', () => log.push('after'));
      expect(() => em.emit('e')).toThrow('listener failed');
      expect(log).toEqual([]);
    },
  },
  {
    group: G4,
    title: 'max listeners: warn once per event past the limit; 0 disables',
    run({ Emitter }, { expect }) {
      const warnings: string[] = [];
      const em = new Emitter({ onWarning: (m) => warnings.push(m) });
      for (let i = 0; i < 10; i++) em.on('a', () => {});
      expect(warnings.length, 'exactly 10 is fine').toBe(0);
      em.on('a', () => {});
      em.on('a', () => {});
      expect(warnings.length).toBe(1);
      em.setMaxListeners(2);
      em.on('b', () => {}); em.on('b', () => {});
      expect(warnings.length).toBe(1);
      em.once('b', () => {});
      expect(warnings.length).toBe(2);
      em.setMaxListeners(0);
      for (let i = 0; i < 50; i++) em.on('c', () => {});
      expect(warnings.length).toBe(2);
    },
  },
  {
    group: G4,
    title: 'once(emitter, name) resolves with the args and cleans up',
    async run({ Emitter, once }, { expect }) {
      const em = new Emitter<{ data: [string, number]; error: [Error] }>();
      const p = once(em, 'data');
      expect(em.listenerCount('data')).toBe(1);
      em.emit('data', 'x', 1);
      em.emit('data', 'y', 2);
      expect(await p).toEqual(['x', 1]);
      expect(em.listenerCount('data')).toBe(0);
      expect(em.listenerCount('error')).toBe(0);
    },
  },
  {
    group: G4,
    title: "once rejects on 'error' and on abort, leaving no listeners",
    async run({ Emitter, once }, { expect }) {
      const em = new Emitter();
      const p1 = once(em, 'ready');
      em.emit('error', new Error('failed first'));
      await expect(p1).toReject('failed first');
      const ac = new AbortController();
      const p2 = once(em, 'ready', { signal: ac.signal });
      ac.abort();
      await expect(p2).toReject((e: any) => e?.name === 'AbortError');
      await expect(once(em, 'ready', { signal: ac.signal })).toReject((e: any) => e?.name === 'AbortError');
      expect([em.listenerCount('ready'), em.listenerCount('error')]).toEqual([0, 0]);
      const pe = once(em, 'error');
      em.emit('error', 'as value');
      expect(await pe).toEqual(['as value']);
    },
  },
];
