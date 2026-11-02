import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Middleware chain';
const G2 = 'Paths and routes';
const G3 = 'Error middleware';
const G4 = 'Async and sub-routers';

function mkRes() {
  const res = { statusCode: 200, body: undefined as unknown, ends: 0, end(b?: unknown) { res.body = b; res.ends++; } };
  return res;
}
const req = (method: string, url: string): any => ({ method, url });

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'middleware runs in order through next() until one ends the response',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const log: string[] = [];
      app.use((rq, rs, next) => { log.push('a'); next(); });
      app.use((rq, rs, next) => { log.push('b'); rs.statusCode = 201; rs.end('done'); });
      app.use(() => { log.push('c'); });
      const res = mkRes();
      await app.handle(req('GET', '/'), res);
      expect(log).toEqual(['a', 'b']);
      expect([res.statusCode, res.body]).toEqual([201, 'done']);
    },
  },
  {
    group: G1,
    title: 'falling off the end is a 404 naming the method and path (no query)',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      app.use((rq, rs, next) => next());
      app.use((rq, rs, next) => next());
      const res = mkRes();
      await app.handle(req('post', '/a?x=1'), res);
      expect([res.statusCode, res.body]).toEqual([404, 'Cannot POST /a']);
    },
  },
  {
    group: G1,
    title: 'calling next twice is a no-op',
    async run({ createRouter }, { expect, flush }) {
      const app = createRouter();
      let hits = 0;
      app.use((rq, rs, next) => { next(); next(); });
      app.use((rq, rs, next) => { hits++; next(); });
      app.use((rq, rs) => { if (hits === 1) rs.end('ok'); });
      const res = mkRes();
      await app.handle(req('GET', '/'), res);
      await flush();
      expect(hits).toBe(1);
      expect(res.ends).toBe(1);
    },
  },
  {
    group: G2,
    title: 'routes match method and whole path; params are decoded; trailing slash and query are fine',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      app.post('/users/:id', (rq, rs) => rs.end('post ' + rq.params!.id));
      app.get('/users/:id/books/:book', (rq, rs) => rs.end(rq.params));
      app.get('/users/:id', (rq, rs) => rs.end('get ' + rq.params!.id));
      app.all('/any', (rq, rs) => rs.end('any ' + rq.method));
      const hit = async (m: string, u: string) => { const r = mkRes(); await app.handle(req(m, u), r); return r.statusCode === 404 ? 404 : r.body; };
      expect(await hit('GET', '/users/7')).toBe('get 7');
      expect(await hit('POST', '/users/7')).toBe('post 7');
      expect(await hit('GET', '/users/a%20b/?q=1')).toBe('get a b');
      expect(await hit('GET', '/users/1/books/x')).toEqual({ id: '1', book: 'x' });
      expect(await hit('GET', '/users')).toBe(404);
      expect(await hit('GET', '/users/7/extra')).toBe(404);
      expect(await hit('DELETE', '/any')).toBe('any DELETE');
      expect(await hit('GET', '/Users/7'), 'case-sensitive').toBe(404);
    },
  },
  {
    group: G2,
    title: 'use(path) matches whole segments and strips the prefix from req.url',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const seen: string[] = [];
      app.use('/api', (rq, rs, next) => { seen.push(`${rq.baseUrl}|${rq.url}|${rq.originalUrl}`); next(); });
      app.use((rq, rs) => { seen.push(`after ${rq.baseUrl}|${rq.url}`); rs.end(); });
      for (const u of ['/api', '/api/', '/api/users?x=1', '/apix']) await app.handle(req('GET', u), mkRes());
      expect(seen).toEqual([
        '/api|/|/api', 'after |/api',
        '/api|/|/api/', 'after |/api/',
        '/api|/users?x=1|/api/users?x=1', 'after |/api/users?x=1',
        'after |/apix',
      ]);
    },
  },
  {
    group: G2,
    title: "next('route') skips the rest of a route's handlers",
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const log: string[] = [];
      app.get('/x', (rq, rs, next) => { log.push('guard'); next(rq.headers ? undefined : 'route'); }, (rq, rs) => { log.push('secret'); rs.end('secret'); });
      app.get('/x', (rq, rs) => { log.push('public'); rs.end('public'); });
      const res = mkRes();
      await app.handle(req('GET', '/x'), res);
      expect(log).toEqual(['guard', 'public']);
      expect(res.body).toBe('public');
      log.length = 0;
      const r2 = mkRes();
      await app.handle({ method: 'GET', url: '/x', headers: {} }, r2);
      expect(log).toEqual(['guard', 'secret']);
    },
  },
  {
    group: G3,
    title: 'next(err) skips normal handlers to the next 4-arity handler; normal handlers ignore it',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const log: string[] = [];
      app.use((err: unknown, rq: any, rs: any, next: any) => { log.push('early err handler'); next(err); });
      app.use((rq, rs, next) => { log.push('fail'); next(new Error('boom')); });
      app.use((rq, rs, next) => { log.push('skipped'); next(); });
      app.get('/', (rq, rs) => { log.push('route skipped'); rs.end(); });
      app.use((err: any, rq: any, rs: any, next: any) => { log.push('handler ' + err.message); rs.statusCode = 418; rs.end(err.message); });
      const res = mkRes();
      await app.handle(req('GET', '/'), res);
      expect(log).toEqual(['fail', 'handler boom']);
      expect([res.statusCode, res.body]).toEqual([418, 'boom']);
    },
  },
  {
    group: G3,
    title: 'an error handler can recover with next(); a throw inside one is the new error',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const log: string[] = [];
      app.use(() => { throw new Error('first'); });
      app.use((err: any, rq: any, rs: any, next: any) => { log.push('recover ' + err.message); next(); });
      app.use((rq, rs, next) => { log.push('normal again'); next(); });
      app.use((err: any, rq: any, rs: any, next: any) => { log.push('not reached'); next(); });
      app.use(() => { throw new Error('second'); });
      app.use((err: any, rq: any, rs: any, next: any) => { log.push('rethrow ' + err.message); throw new Error('third'); });
      app.use((err: any, rq: any, rs: any, next: any) => { log.push('final ' + err.message); rs.end(err.message); });
      const res = mkRes();
      await app.handle(req('GET', '/'), res);
      expect(log).toEqual(['recover first', 'normal again', 'rethrow second', 'final third']);
    },
  },
  {
    group: G3,
    title: 'unhandled errors: err.status or 500, body is the message',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      app.get('/a', () => { throw Object.assign(new Error('nope'), { status: 403 }); });
      app.get('/b', (rq, rs, next) => next(new Error('crash')));
      app.get('/c', (rq, rs, next) => next('plain string'));
      const r = async (u: string) => { const res = mkRes(); await app.handle(req('GET', u), res); return [res.statusCode, res.body]; };
      expect(await r('/a')).toEqual([403, 'nope']);
      expect(await r('/b')).toEqual([500, 'crash']);
      expect(await r('/c')).toEqual([500, 'plain string']);
    },
  },
  {
    group: G4,
    title: 'async handlers: a rejection becomes an error; awaiting then calling next works',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const log: string[] = [];
      app.use(async (rq, rs, next) => { await Promise.resolve(); log.push('async ok'); next(); });
      app.get('/bad', async () => { await Promise.resolve(); throw new Error('async boom'); });
      app.get('/late', async (rq, rs, next) => { next(); throw new Error('after next: ignored'); });
      app.get('/late', (rq, rs) => rs.end('late ok'));
      app.use((err: any, rq: any, rs: any, next: any) => { rs.statusCode = 500; rs.end('caught ' + err.message); });
      const a = mkRes();
      await app.handle(req('GET', '/bad'), a);
      expect(a.body).toBe('caught async boom');
      const b = mkRes();
      await app.handle(req('GET', '/late'), b);
      expect(b.body).toBe('late ok');
      expect(log).toEqual(['async ok', 'async ok']);
    },
  },
  {
    group: G4,
    title: 'sub-routers: baseUrl, stripped url, own params, restored on the way out',
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const api = createRouter();
      const v1 = createRouter();
      const seen: unknown[] = [];
      v1.get('/users/:id', (rq, rs, next) => { seen.push([rq.baseUrl, rq.url, rq.originalUrl, rq.params]); next(); });
      api.use('/v1', v1);
      app.use('/api', api);
      app.use((rq, rs) => { seen.push([rq.baseUrl, rq.url]); rs.end(); });
      await app.handle(req('GET', '/api/v1/users/7?z=1'), mkRes());
      expect(seen).toEqual([
        ['/api/v1', '/users/7?z=1', '/api/v1/users/7?z=1', { id: '7' }],
        ['', '/api/v1/users/7?z=1'],
      ]);
    },
  },
  {
    group: G4,
    title: "errors and next('router') leave a sub-router and continue in the parent",
    async run({ createRouter }, { expect }) {
      const app = createRouter();
      const sub = createRouter();
      const log: string[] = [];
      sub.use((rq, rs, next) => { log.push('sub ' + rq.url); next(rq.url === '/skip' ? 'router' : undefined); });
      sub.get('/skip', () => log.push('not reached'));
      sub.get('/fail', () => { throw new Error('sub failed'); });
      sub.use((err: any, rq: any, rs: any, next: any) => { log.push('sub sees ' + err.message); next(err); });
      app.use('/s', sub);
      app.use((rq, rs) => { log.push('parent normal'); rs.end(); });
      app.use((err: any, rq: any, rs: any, next: any) => { log.push('parent error ' + err.message); rs.end(); });
      await app.handle(req('GET', '/s/skip'), mkRes());
      await app.handle(req('GET', '/s/fail'), mkRes());
      expect(log).toEqual(['sub /skip', 'parent normal', 'sub /fail', 'sub sees sub failed', 'parent error sub failed']);
    },
  },
];
