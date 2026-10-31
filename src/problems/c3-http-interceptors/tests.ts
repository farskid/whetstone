import type { TestCase, Deferred } from '../../runner/types';
type M = typeof import('./solution');
type RequestConfig = import('./solution').RequestConfig;

/** Adapter that echoes the request and records it. */
const echo = () => {
  const calls: RequestConfig[] = [];
  const adapter = async (c: RequestConfig) => { calls.push(c); return { status: 200, data: { url: c.url, method: c.method, headers: c.headers, body: c.body } }; };
  return { calls, adapter };
};

/** Fake API that accepts only the current server token; refresh is resolved by hand. */
function authWorld(deferred: <T>() => Deferred<T>) {
  const world = {
    serverToken: 't1',
    clientToken: 't0' as string | null, // expired
    sent: [] as { url: string; auth: string | undefined }[],
    refreshes: [] as Deferred<string>[],
    adapter: async (c: RequestConfig) => {
      const auth = c.headers?.Authorization;
      world.sent.push({ url: c.url, auth });
      if (auth !== `Bearer ${world.serverToken}`) return { status: 401, data: { error: 'expired' } };
      return { status: 200, data: `ok ${c.url}` };
    },
    getToken: () => world.clientToken,
    refresh: () => {
      const d = deferred<string>();
      world.refreshes.push(d);
      return d.promise.then((t) => { world.clientToken = t; return t; });
    },
  };
  return world;
}

const settle = <T>(p: Promise<T>) => p.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e }));

export const tests: TestCase<M>[] = [
  {
    title: 'request() calls the adapter and builds the response',
    async run({ createClient }, { expect }) {
      const { calls, adapter } = echo();
      const api = createClient({ adapter });
      const res = await api.post('/items', { a: 1 }, { headers: { 'X-A': '1' } });
      expect(calls).toEqual([{ method: 'POST', url: '/items', body: { a: 1 }, headers: { 'X-A': '1' } }]);
      expect([res.status, res.headers]).toEqual([200, {}]);
      expect(res.config.url).toBe('/items');
      const g = await api.get('/x');
      expect(g.config.method).toBe('GET');
    },
  },
  {
    title: 'baseURL joining',
    async run({ createClient }, { expect }) {
      const { calls, adapter } = echo();
      const api = createClient({ adapter, baseURL: 'https://api.test/v1/' });
      await api.get('/users');
      await api.get('users/2');
      await api.get('https://other.test/x');
      expect(calls.map((c) => c.url)).toEqual(['https://api.test/v1/users', 'https://api.test/v1/users/2', 'https://other.test/x']);
      const res = await api.get('/users');
      expect(res.config.url, 'response.config keeps the un-joined url').toBe('/users');
    },
  },
  {
    title: 'non-2xx rejects with HttpError; adapter errors pass through',
    async run({ createClient, HttpError }, { expect }) {
      const api = createClient({ adapter: async (c) => (c.url === '/net' ? Promise.reject(new TypeError('Failed to fetch')) : { status: 404, data: 'nope' }) });
      const r = await settle(api.get('/missing'));
      expect(r.ok).toBe(false);
      const e = (r as { e: any }).e;
      expect(e).toBeInstanceOf(HttpError);
      expect([e.message, e.status, e.response.data, e.config.url]).toEqual(['Request failed with status 404', 404, 'nope', '/missing']);
      const n = await settle(api.get('/net'));
      expect((n as { e: Error }).e.message).toBe('Failed to fetch');
    },
  },
  {
    title: "the caller's config is never mutated",
    async run({ createClient }, { expect }) {
      const api = createClient({ adapter: echo().adapter });
      api.interceptors.request.use((c) => { c.headers!['X-Mutated'] = 'yes'; c.url += '?x'; return c; });
      const config = { url: '/a', headers: { A: '1' } };
      await api.request(config);
      expect(config).toEqual({ url: '/a', headers: { A: '1' } });
    },
  },
  {
    title: 'request interceptors run last-added-first; response interceptors in order',
    async run({ createClient }, { expect }) {
      const log: string[] = [];
      const api = createClient({ adapter: async () => { log.push('adapter'); return { status: 200, data: '' }; } });
      api.interceptors.request.use((c) => { log.push('req1'); return c; });
      api.interceptors.request.use(async (c) => { log.push('req2'); return c; });
      api.interceptors.response.use((r) => { log.push('res1'); return r; });
      api.interceptors.response.use(async (r) => { log.push('res2'); return { ...r, data: 'transformed' }; });
      const res = await api.get('/');
      expect(log).toEqual(['req2', 'req1', 'adapter', 'res1', 'res2']);
      expect(res.data).toBe('transformed');
    },
  },
  {
    title: 'eject removes an interceptor',
    async run({ createClient }, { expect }) {
      const api = createClient({ adapter: echo().adapter });
      const a = api.interceptors.request.use((c) => ({ ...c, headers: { ...c.headers, A: '1' } }));
      api.interceptors.request.use((c) => ({ ...c, headers: { ...c.headers, B: '1' } }));
      api.interceptors.request.eject(a);
      api.interceptors.request.eject(999);
      const res = await api.get<{ headers: Record<string, string> }>('/');
      expect(res.data.headers).toEqual({ B: '1' });
    },
  },
  {
    title: 'errors skip fulfilled handlers (and the adapter); onRejected can recover',
    async run({ createClient }, { expect }) {
      const log: string[] = [];
      const api = createClient({ adapter: async () => { log.push('adapter'); return { status: 200, data: '' }; } });
      api.interceptors.request.use((c) => { log.push('reqB'); return c; }, (e) => { log.push('reqB-rej'); throw e; });
      api.interceptors.request.use(() => { throw new Error('bad config'); });
      api.interceptors.response.use(() => { log.push('res1'); return null as never; }, (e) => {
        log.push(`res1-rej ${(e as Error).message}`);
        return { status: 299, data: 'recovered', headers: {}, config: { url: '' } };
      });
      api.interceptors.response.use((r) => { log.push(`res2 ${r.data}`); return r; });
      const res = await api.get('/');
      expect(res.data).toBe('recovered');
      expect(log).toEqual(['reqB-rej', 'res1-rej bad config', 'res2 recovered']);
    },
  },
  {
    title: 'HTTP errors reach response onRejected handlers',
    async run({ createClient, HttpError }, { expect }) {
      const api = createClient({ adapter: async () => ({ status: 503, data: 'down' }) });
      let seen: unknown;
      api.interceptors.response.use((r) => r, (e) => { seen = e; throw e; });
      await settle(api.get('/'));
      expect(seen).toBeInstanceOf(HttpError);
    },
  },
  {
    title: 'auth: adds the bearer token (and nothing when there is none)',
    async run({ createClient, installAuthRefresh }, { expect }) {
      const { calls, adapter } = echo();
      const api = createClient({ adapter });
      let token: string | null = 'abc';
      installAuthRefresh(api, { getToken: () => token, refresh: async () => 'never' });
      await api.get('/a', { headers: { X: '1' } });
      token = null;
      await api.get('/b');
      expect(calls.map((c) => c.headers)).toEqual([{ X: '1', Authorization: 'Bearer abc' }, {}]);
    },
  },
  {
    title: 'auth: a 401 refreshes and retries once with the new token',
    async run({ createClient, installAuthRefresh }, { expect, deferred, flush }) {
      const w = authWorld(deferred);
      const api = createClient({ adapter: w.adapter });
      installAuthRefresh(api, w);
      const p = api.get('/me');
      await flush();
      expect(w.refreshes.length).toBe(1);
      w.refreshes[0].resolve('t1');
      const res = await p;
      expect(res.data).toBe('ok /me');
      expect(w.sent).toEqual([{ url: '/me', auth: 'Bearer t0' }, { url: '/me', auth: 'Bearer t1' }]);
    },
  },
  {
    title: 'auth: concurrent 401s share ONE refresh',
    input: '5 parallel requests with an expired token',
    async run({ createClient, installAuthRefresh }, { expect, deferred, flush }) {
      const w = authWorld(deferred);
      const api = createClient({ adapter: w.adapter });
      installAuthRefresh(api, w);
      const all = Promise.all(['/a', '/b', '/c', '/d', '/e'].map((u) => api.get(u)));
      await flush();
      expect(w.refreshes.length, 'refresh calls').toBe(1);
      w.refreshes[0].resolve('t1');
      const res = await all;
      expect(res.map((r) => r.data)).toEqual(['ok /a', 'ok /b', 'ok /c', 'ok /d', 'ok /e']);
      expect(w.refreshes.length).toBe(1);
      expect(w.sent.filter((s) => s.auth === 'Bearer t1').length).toBe(5);
    },
  },
  {
    title: 'auth: requests started during a refresh wait for it',
    async run({ createClient, installAuthRefresh }, { expect, deferred, flush }) {
      const w = authWorld(deferred);
      const api = createClient({ adapter: w.adapter });
      installAuthRefresh(api, w);
      const first = api.get('/first');
      await flush();
      const second = api.get('/second');
      await flush();
      expect(w.sent.map((s) => s.url), '/second must not be sent with the expired token').toEqual(['/first']);
      w.refreshes[0].resolve('t1');
      await Promise.all([first, second]);
      expect(w.sent.filter((s) => s.url === '/second')).toEqual([{ url: '/second', auth: 'Bearer t1' }]);
    },
  },
  {
    title: 'auth: a late 401 from an old token retries without refreshing again',
    input: 'slow request sent with t0 returns 401 after the refresh to t1 already finished',
    async run({ createClient, installAuthRefresh }, { expect, deferred, flush }) {
      const w = authWorld(deferred);
      const slow = deferred<void>();
      const api = createClient({ adapter: async (c) => { if (c.url === '/slow' && !c.retried) await slow.promise; return w.adapter(c); } });
      installAuthRefresh(api, w);
      const s = api.get('/slow');
      const fast = api.get('/fast');
      await flush();
      w.refreshes[0].resolve('t1');
      await fast;
      slow.resolve();
      const res = await s;
      expect(res.data).toBe('ok /slow');
      expect(w.refreshes.length, 'no second refresh').toBe(1);
    },
  },
  {
    title: 'auth: never loops; a 401 after the retry rejects',
    async run({ createClient, installAuthRefresh, HttpError }, { expect, deferred, flush }) {
      const w = authWorld(deferred);
      const api = createClient({ adapter: w.adapter });
      installAuthRefresh(api, w);
      const p = settle(api.get('/me'));
      await flush();
      w.refreshes[0].resolve('still-wrong');
      const r = await p;
      expect(r.ok).toBe(false);
      expect((r as { e: unknown }).e).toBeInstanceOf(HttpError);
      expect(w.sent.length).toBe(2);
      expect(w.refreshes.length).toBe(1);
    },
  },
  {
    title: 'auth: refresh failure rejects every waiter; a later 401 can refresh again',
    async run({ createClient, installAuthRefresh }, { expect, deferred, flush }) {
      const w = authWorld(deferred);
      const api = createClient({ adapter: w.adapter });
      installAuthRefresh(api, w);
      const a = settle(api.get('/a'));
      const b = settle(api.get('/b'));
      await flush();
      const fail = new Error('refresh token revoked');
      w.refreshes[0].reject(fail);
      const [ra, rb] = [await a, await b];
      expect([(ra as { e: unknown }).e, (rb as { e: unknown }).e]).toEqual([fail, fail]);
      expect(w.refreshes.length).toBe(1);
      const c = api.get('/c');
      await flush();
      expect(w.refreshes.length, 'next 401 → new refresh').toBe(2);
      w.refreshes[1].resolve('t1');
      expect((await c).data).toBe('ok /c');
    },
  },
  {
    title: 'auth: non-401 errors pass through; uninstall removes both interceptors',
    async run({ createClient, installAuthRefresh }, { expect }) {
      let refreshed = 0;
      const sent: (string | undefined)[] = [];
      const api = createClient({ adapter: async (c) => { sent.push(c.headers?.Authorization); return { status: c.url === '/500' ? 500 : 401 }; } });
      const uninstall = installAuthRefresh(api, { getToken: () => 'x', refresh: async () => { refreshed++; return 'x'; } });
      const r = await settle(api.get('/500'));
      expect([(r as { e: any }).e.status, refreshed]).toEqual([500, 0]);
      uninstall();
      const r2 = await settle(api.get('/401'));
      expect([(r2 as { e: any }).e.status, refreshed]).toEqual([401, 0]);
      expect(sent).toEqual(['Bearer x', undefined]);
    },
  },
];
