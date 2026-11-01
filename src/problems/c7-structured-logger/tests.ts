import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');
type Transport = import('./solution').Transport;

const G1 = 'JSON lines';
const G2 = 'Child loggers';
const G3 = 'Redaction and serializers';
const G4 = 'Transports';

function memory(level?: Transport['level']) {
  const writes: string[] = [];
  const t: Transport = { level, write: (c) => { writes.push(c); } };
  return { t, writes, lines: () => writes.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l)) };
}
const now = () => 1000;

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'writes one JSON line per call with level, time, fields and msg',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ transports: [m.t], now });
      log.info({ userId: 7 }, 'signed in');
      log.warn('disk low');
      log.info({ only: true });
      await log.flush();
      expect(m.writes.join('')).toBe(
        '{"level":30,"time":1000,"userId":7,"msg":"signed in"}\n' +
        '{"level":40,"time":1000,"msg":"disk low"}\n' +
        '{"level":30,"time":1000,"only":true}\n');
    },
  },
  {
    group: G1,
    title: 'level filter, isLevelEnabled and runtime level changes',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ level: 'warn', transports: [m.t], now });
      log.info('hidden'); log.debug('hidden'); log.error('shown'); log.fatal('shown');
      expect(log.isLevelEnabled('info')).toBe(false);
      log.level = 'debug';
      log.debug('now shown');
      expect(log.level).toBe('debug');
      await log.flush();
      expect(m.lines().map((l) => l.level)).toEqual([50, 60, 20]);
      expect(() => { log.level = 'loud' as any; }).toThrow();
      expect(() => createLogger({ level: 'verbose' as any, transports: [] })).toThrow();
    },
  },
  {
    group: G1,
    title: 'errors as the first argument log under err with msg defaulting to the message; reserved keys ignored',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ transports: [m.t], now, base: { app: 'api' } });
      log.error(new Error('db down'));
      log.error(new Error('x'), 'custom');
      log.info({ level: 99, time: 5, msg: 'sneaky', ok: 1 }, 'real');
      await log.flush();
      const [a, b, c] = m.lines();
      expect(a.msg).toBe('db down');
      expect(a.err.message).toBe('db down');
      expect(a.app).toBe('api');
      expect(b.msg).toBe('custom');
      expect(c).toEqual({ level: 30, time: 1000, app: 'api', ok: 1, msg: 'real' });
    },
  },
  {
    group: G2,
    title: 'child bindings merge; inner children and call fields win',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ transports: [m.t], now, base: { svc: 'api', env: 'prod' } });
      const req = log.child({ reqId: 'a1', env: 'staging' });
      const step = req.child({ reqId: 'a1/2', step: 'auth' });
      step.info({ step: 'db' }, 'go');
      req.info('plain');
      await step.flush();
      expect(m.writes.join('')).toBe(
        '{"level":30,"time":1000,"svc":"api","env":"staging","reqId":"a1/2","step":"db","msg":"go"}\n' +
        '{"level":30,"time":1000,"svc":"api","env":"staging","reqId":"a1","msg":"plain"}\n');
    },
  },
  {
    group: G2,
    title: 'children follow the parent level live until they set their own',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ transports: [m.t], now });
      const kid = log.child({ k: 1 });
      kid.debug('no');
      log.level = 'debug';
      kid.debug('yes');
      expect(kid.level).toBe('debug');
      kid.level = 'error';
      log.level = 'trace';
      kid.warn('no');
      log.trace('root trace');
      await log.flush();
      expect(m.lines().map((l) => l.msg)).toEqual(['yes', 'root trace']);
    },
  },
  {
    group: G3,
    title: 'circular objects do not crash; shared references are not circular',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ transports: [m.t], now });
      const a: any = { name: 'a' }; a.self = a; a.list = [a, 1];
      const shared = { x: 1 };
      log.info({ a, pair: [shared, shared], big: 10n, fn: () => 1, when: new Date(0) });
      await log.flush();
      const [l] = m.lines();
      expect(l.a).toEqual({ name: 'a', self: '[Circular]', list: ['[Circular]', 1] });
      expect(l.pair).toEqual([{ x: 1 }, { x: 1 }]);
      expect(l.big).toBe('10');
      expect('fn' in l).toBe(false);
      expect(l.when).toBe('1970-01-01T00:00:00.000Z');
    },
  },
  {
    group: G3,
    title: 'errors serialize with type, stack, own props and cause',
    async run({ createLogger, serializeError }, { expect }) {
      class DbError extends Error { code = 'ECONN'; }
      const root = new TypeError('socket closed');
      const err = new DbError('query failed', { cause: root });
      const s = serializeError(err) as any;
      expect(s.type).toBe('DbError');
      expect(s.message).toBe('query failed');
      expect(typeof s.stack === 'string' && s.stack.includes('query failed')).toBe(true);
      expect(s.code).toBe('ECONN');
      expect(s.cause.type).toBe('TypeError');
      expect(s.cause.message).toBe('socket closed');
      const m = memory();
      const log = createLogger({ transports: [m.t], now });
      const loop: any = new Error('loop'); loop.cause = loop;
      log.error({ err: loop, nested: { e: new RangeError('r') } });
      await log.flush();
      const [l] = m.lines();
      expect(l.err.cause).toBe('[Circular]');
      expect(l.nested.e.type).toBe('RangeError');
    },
  },
  {
    group: G3,
    title: 'redaction paths with wildcards, without mutating the input',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ transports: [m.t], now, redact: ['req.headers.authorization', '*.password', 'token', 'missing.path'] });
      const input = { req: { headers: { authorization: 'Bearer x', host: 'h' } }, user: { name: 'n', password: 'p' }, admin: { password: 'q' }, token: 't' };
      log.info(input);
      log.child({ token: 'from-binding' }).info('child');
      await log.flush();
      const [a, b] = m.lines();
      expect(a.req.headers).toEqual({ authorization: '[Redacted]', host: 'h' });
      expect(a.user).toEqual({ name: 'n', password: '[Redacted]' });
      expect(a.admin.password).toBe('[Redacted]');
      expect(a.token).toBe('[Redacted]');
      expect('missing' in a).toBe(false);
      expect(b.token).toBe('[Redacted]');
      expect(input.req.headers.authorization).toBe('Bearer x');
      expect(input.user.password).toBe('p');
    },
  },
  {
    group: G3,
    title: 'custom serializers transform top-level fields',
    async run({ createLogger }, { expect }) {
      const m = memory();
      const log = createLogger({ transports: [m.t], now, serializers: { req: (r) => ({ method: r.method, url: r.url }), err: (e) => ({ msg: e.message }) } });
      log.info({ req: { method: 'GET', url: '/', socket: { huge: true } } });
      log.error(new Error('boom'));
      await log.flush();
      const [a, b] = m.lines();
      expect(a.req).toEqual({ method: 'GET', url: '/' });
      expect(b.err).toEqual({ msg: 'boom' });
    },
  },
  {
    group: G4,
    title: 'per-transport levels',
    async run({ createLogger }, { expect }) {
      const all = memory();
      const errorsOnly = memory('error');
      const log = createLogger({ level: 'debug', transports: [all.t, errorsOnly.t], now });
      log.debug('d'); log.info('i'); log.error('e');
      await log.flush();
      expect(all.lines().map((l) => l.msg)).toEqual(['d', 'i', 'e']);
      expect(errorsOnly.lines().map((l) => l.msg)).toEqual(['e']);
    },
  },
  {
    group: G4,
    title: 'writes are async, batched per tick, one at a time, and flush waits for them',
    async run({ createLogger }, { expect, deferred }) {
      const writes: string[] = [];
      const gates: Array<{ resolve: () => void }> = [];
      let inFlight = 0, maxInFlight = 0;
      const t: Transport = {
        write(c) {
          writes.push(c); inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
          const d = deferred<void>(); gates.push(d);
          return d.promise.then(() => { inFlight--; });
        },
      };
      const log = createLogger({ transports: [t], now });
      log.info('a'); log.info('b');
      expect(writes.length, 'nothing written synchronously').toBe(0);
      await Promise.resolve(); await Promise.resolve();
      expect(writes.length).toBe(1);
      expect(writes[0].split('\n').filter(Boolean).length, 'same-tick lines batched').toBe(2);
      log.info('c'); log.info('d');
      let flushed = false;
      const f = log.child({}).flush().then(() => { flushed = true; });
      for (let i = 0; i < 5; i++) await Promise.resolve();
      expect(writes.length, 'second write waits for the first').toBe(1);
      expect(flushed).toBe(false);
      gates[0].resolve();
      for (let i = 0; i < 10; i++) await Promise.resolve();
      expect(writes.length).toBe(2);
      expect(writes[1]).toContain('"msg":"c"');
      expect(writes[1]).toContain('"msg":"d"');
      expect(flushed).toBe(false);
      gates[1].resolve();
      await f;
      expect(maxInFlight).toBe(1);
    },
  },
  {
    group: G4,
    title: 'failed writes go to onError and the queue continues; sampling drops lines',
    async run({ createLogger }, { expect }) {
      const errors: string[] = [];
      let n = 0;
      const ok: string[] = [];
      const t: Transport = { write: async (c) => { if (n++ === 0) throw new Error('EPIPE'); ok.push(c); } };
      const log = createLogger({ transports: [t], now, onError: (e: any, chunk) => errors.push(`${e.message}:${JSON.parse(chunk).msg}`) });
      log.info('lost');
      await log.flush();
      log.info('kept');
      await log.flush();
      expect(errors).toEqual(['EPIPE:lost']);
      expect(ok.length).toBe(1);

      const m = memory();
      const rolls = [0.05, 0.5, 0.09, 0.95];
      let serialized = 0;
      const sampled = createLogger({ level: 'debug', transports: [m.t], now, sample: { debug: 0.1 }, random: () => rolls.shift()!, serializers: { probe: (v) => { serialized++; return v; } } });
      for (let i = 0; i < 4; i++) sampled.debug({ probe: i }, 'd' + i);
      sampled.info('always');
      await sampled.flush();
      expect(m.lines().map((l) => l.msg)).toEqual(['d0', 'd2', 'always']);
      expect(serialized, 'dropped lines are not serialized').toBe(2);
    },
  },
];
