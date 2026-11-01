import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const T = 1700000000;
const PAYLOAD = '{"id":"evt_1","type":"invoice.paid"}';
/** HMAC-SHA256 hex of `${T}.${PAYLOAD}`, worked out ahead of time. */
const SIG_TEST = '4aa90aa69730f112c87accbf54203d1076675eae3b18a5cb82b5ab9e7f5cd5bc'; // secret whsec_test
const SIG_OLD = 'd13175aede5abd17f608014cc932a35d96e3c14e1ca5933a3a87aa37a60768fb'; // secret whsec_old
const at = (sec: number) => ({ now: () => sec * 1000 });

async function code(p: Promise<unknown> | (() => unknown)): Promise<string> {
  try {
    await (typeof p === 'function' ? p() : p);
    return 'ok';
  } catch (e) {
    return (e as { code?: string }).code ?? `not a WebhookError: ${(e as Error).message}`;
  }
}

type Ev = { id: string; obj: string; v: number };

export const tests: TestCase<M>[] = [
  {
    group: 'Signatures',
    title: 'parseSignatureHeader reads t and every v1',
    async run({ parseSignatureHeader, WebhookError }, { expect }) {
      expect(parseSignatureHeader(`t=${T},v1=abc,v0=legacy,v1=def`)).toEqual({ timestamp: T, signatures: ['abc', 'def'] });
      expect(parseSignatureHeader(` t=5 , v1=x `), 'spaces around items are ignored').toEqual({ timestamp: 5, signatures: ['x'] });
      for (const bad of ['', 'v1=abc', 't=12x,v1=a', 't=1,t=2,v1=a', 't=1', 't=1,v0=a', 't=1,junk,v1=a', '=1,t=1,v1=a']) {
        expect(await code(() => parseSignatureHeader(bad)), JSON.stringify(bad)).toBe('malformed');
      }
      let err: unknown;
      try { parseSignatureHeader('nope'); } catch (e) { err = e; }
      expect(err).toBeInstanceOf(WebhookError);
    },
  },
  {
    group: 'Signatures',
    title: 'timingSafeEqual compares whole strings',
    run({ timingSafeEqual }, { expect }) {
      expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
      expect(timingSafeEqual('abc123', 'abc124')).toBe(false);
      expect(timingSafeEqual('xbc123', 'abc123')).toBe(false);
      expect(timingSafeEqual('abc', 'abc1'), 'different lengths').toBe(false);
      expect(timingSafeEqual('abc1', 'abc')).toBe(false);
      expect(timingSafeEqual('', '')).toBe(true);
    },
  },
  {
    group: 'Signatures',
    title: 'a correct HMAC-SHA256 signature verifies',
    async run({ verifySignature }, { expect }) {
      expect(await verifySignature({ payload: PAYLOAD, header: `t=${T},v1=${SIG_TEST}`, secrets: 'whsec_test', clock: at(T + 5) })).toEqual({ timestamp: T });
      expect(await code(verifySignature({ payload: PAYLOAD, header: `t=${T},v1=deadbeef,v1=${SIG_TEST}`, secrets: 'whsec_test', clock: at(T) })), 'any v1 may match').toBe('ok');
    },
  },
  {
    group: 'Signatures',
    title: 'a changed body, timestamp or secret does not verify',
    async run({ verifySignature }, { expect }) {
      const reserialized = JSON.stringify(JSON.parse(PAYLOAD), null, 2);
      expect(await code(verifySignature({ payload: reserialized, header: `t=${T},v1=${SIG_TEST}`, secrets: 'whsec_test', clock: at(T) })), 'same JSON, different bytes').toBe('no_match');
      expect(await code(verifySignature({ payload: PAYLOAD, header: `t=${T + 1},v1=${SIG_TEST}`, secrets: 'whsec_test', clock: at(T) })), 'the timestamp is signed too').toBe('no_match');
      expect(await code(verifySignature({ payload: PAYLOAD, header: `t=${T},v1=${SIG_TEST}`, secrets: 'whsec_other', clock: at(T) }))).toBe('no_match');
      expect(await code(verifySignature({ payload: PAYLOAD, header: `t=${T},v1=${SIG_TEST.slice(0, 63)}`, secrets: 'whsec_test', clock: at(T) }))).toBe('no_match');
      expect(await code(verifySignature({ payload: PAYLOAD, header: `v1=${SIG_TEST}`, secrets: 'whsec_test', clock: at(T) }))).toBe('malformed');
    },
  },
  {
    group: 'Replay protection',
    title: 'timestamps older than the tolerance are rejected',
    async run({ verifySignature }, { expect }) {
      const v = (now: number, toleranceSec?: number, header = `t=${T},v1=${SIG_TEST}`) =>
        code(verifySignature({ payload: PAYLOAD, header, secrets: 'whsec_test', clock: at(now), toleranceSec }));
      expect(await v(T + 300), 'exactly 300 s old').toBe('ok');
      expect(await v(T + 301)).toBe('too_old');
      expect(await v(T + 11, 10)).toBe('too_old');
      expect(await v(T + 10, 10)).toBe('ok');
      expect(await v(T - 3600), 'a timestamp ahead of our clock is fine').toBe('ok');
      expect(await v(T + 10_000, undefined, `t=${T},v1=bad`), 'the signature is checked before the age').toBe('no_match');
      const realNow = await code(verifySignature({ payload: PAYLOAD, header: `t=${T},v1=${SIG_TEST}`, secrets: 'whsec_test' }));
      expect(realNow, 'with no clock, Date.now() is used (and this 2023 timestamp is old)').toBe('too_old');
    },
  },
  {
    group: 'Idempotency',
    title: 'a repeated event id returns the stored result',
    async run({ createWebhookHandler }, { expect }) {
      let n = 0;
      const h = createWebhookHandler<Ev, string>({ handle: async (e) => `done ${e.id} #${++n}` });
      expect(await h.process({ id: 'evt_1', obj: 'a', v: 1 })).toEqual({ status: 'applied', result: 'done evt_1 #1', duplicate: false });
      expect(await h.process({ id: 'evt_1', obj: 'a', v: 1 })).toEqual({ status: 'applied', result: 'done evt_1 #1', duplicate: true });
      expect(await h.process({ id: 'evt_2', obj: 'a', v: 1 })).toEqual({ status: 'applied', result: 'done evt_2 #2', duplicate: false });
      expect(n).toBe(2);
    },
  },
  {
    group: 'Idempotency',
    title: 'concurrent duplicates wait for the first delivery',
    async run({ createWebhookHandler }, { expect, deferred, flush }) {
      const d = deferred<string>();
      let n = 0;
      const h = createWebhookHandler<Ev, string>({ handle: () => { n++; return d.promise; } });
      const a = h.process({ id: 'evt_1', obj: 'a', v: 1 });
      const b = h.process({ id: 'evt_1', obj: 'a', v: 1 });
      await flush();
      expect(n).toBe(1);
      d.resolve('ok');
      expect(await Promise.all([a, b])).toEqual([
        { status: 'applied', result: 'ok', duplicate: false },
        { status: 'applied', result: 'ok', duplicate: true },
      ]);
    },
  },
  {
    group: 'Idempotency',
    title: 'a failed handler leaves the event retryable',
    async run({ createWebhookHandler }, { expect, deferred }) {
      const d = deferred<string>();
      let n = 0;
      const h = createWebhookHandler<Ev, string>({ handle: () => (++n === 1 ? d.promise : Promise.resolve('second try')) });
      const a = h.process({ id: 'evt_1', obj: 'a', v: 1 }).catch((e: Error) => e.message);
      const b = h.process({ id: 'evt_1', obj: 'a', v: 1 }).catch((e: Error) => e.message);
      d.reject(new Error('db down'));
      expect(await Promise.all([a, b]), 'both deliveries see the failure').toEqual(['db down', 'db down']);
      expect(await h.process({ id: 'evt_1', obj: 'a', v: 1 })).toEqual({ status: 'applied', result: 'second try', duplicate: false });
      expect(n).toBe(2);
    },
  },
  {
    group: 'Rotation and ordering',
    title: 'secret rotation: several secrets and several v1 values',
    async run({ verifySignature }, { expect }) {
      const v = (header: string, secrets: string | string[]) => code(verifySignature({ payload: PAYLOAD, header, secrets, clock: at(T) }));
      const both = `t=${T},v1=${SIG_OLD},v1=${SIG_TEST}`;
      expect(await v(both, 'whsec_test')).toBe('ok');
      expect(await v(both, ['whsec_old'])).toBe('ok');
      expect(await v(`t=${T},v1=${SIG_OLD}`, ['whsec_test', 'whsec_old']), 'during rotation we accept either secret').toBe('ok');
      expect(await v(`t=${T},v1=${SIG_OLD}`, ['whsec_test'])).toBe('no_match');
      expect(await v(`t=${T},v1=${SIG_OLD}`, [])).toBe('no_match');
    },
  },
  {
    group: 'Rotation and ordering',
    title: 'events for one object run one at a time, in arrival order',
    async run({ createWebhookHandler }, { expect, deferred, flush }) {
      const gates = new Map<string, ReturnType<typeof deferred<string>>>();
      const log: string[] = [];
      const h = createWebhookHandler<Ev, string>({
        getKey: (e) => e.obj,
        handle: (e) => {
          log.push(`start ${e.id}`);
          const d = deferred<string>();
          gates.set(e.id, d);
          return d.promise.then((r) => { log.push(`end ${e.id}`); return r; });
        },
      });
      const p1 = h.process({ id: 'e1', obj: 'a', v: 1 });
      const p2 = h.process({ id: 'e2', obj: 'a', v: 2 });
      const p3 = h.process({ id: 'e3', obj: 'b', v: 1 });
      await flush();
      expect(log, "e2 waits for e1; b doesn't wait for a").toEqual(['start e1', 'start e3']);
      gates.get('e1')!.reject(new Error('x'));
      await p1.catch(() => {});
      await flush();
      expect(log, 'a failure does not block the queue').toEqual(['start e1', 'start e3', 'start e2']);
      gates.get('e2')!.resolve('two');
      gates.get('e3')!.resolve('three');
      expect((await p2).status).toBe('applied');
      expect((await p3).status).toBe('applied');
    },
  },
  {
    group: 'Rotation and ordering',
    title: 'out-of-order events older than the stored version are skipped',
    async run({ createWebhookHandler }, { expect }) {
      const applied: string[] = [];
      let failNext = false;
      const h = createWebhookHandler<Ev, string>({
        getKey: (e) => e.obj,
        getVersion: (e) => e.v,
        handle: async (e) => {
          if (failNext) { failNext = false; throw new Error('boom'); }
          applied.push(e.id);
          return e.id;
        },
      });
      expect(await h.process({ id: 'e2', obj: 'a', v: 2 })).toEqual({ status: 'applied', result: 'e2', duplicate: false });
      expect(await h.process({ id: 'e1', obj: 'a', v: 1 })).toEqual({ status: 'stale', duplicate: false });
      expect(await h.process({ id: 'e2b', obj: 'a', v: 2 }), 'same version is not newer').toEqual({ status: 'stale', duplicate: false });
      expect((await h.process({ id: 'b1', obj: 'b', v: 1 })).status, 'versions are per object').toBe('applied');
      failNext = true;
      await h.process({ id: 'e4', obj: 'a', v: 4 }).catch(() => {});
      expect((await h.process({ id: 'e3', obj: 'a', v: 3 })).status, 'a failed event does not bump the version').toBe('applied');
      expect((await h.process({ id: 'e1', obj: 'a', v: 1 })), 'a stale result is remembered too').toEqual({ status: 'stale', duplicate: true });
      expect(applied).toEqual(['e2', 'b1', 'e3']);
      const plain = createWebhookHandler<Ev, number>({ handle: async (e) => e.v });
      await plain.process({ id: 'x2', obj: 'a', v: 2 });
      expect((await plain.process({ id: 'x1', obj: 'a', v: 1 })).status, 'no getKey: no ordering rules').toBe('applied');
    },
  },
];
