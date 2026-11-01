import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

type Reply = number | [number, unknown?, Record<string, string>?] | Error | 'hang';

/**
 * A fake fetch that answers from a script and records what it saw (and when).
 * It answers without waiting for the body, because a browser may need a real task to read it and that would stall the fake clock.
 */
function server(script: Reply[], now: () => number = () => 0) {
  const seen: { method: string; url: string; headers: Record<string, string>; body: Promise<string | null>; at: number; signal: AbortSignal }[] = [];
  let i = 0;
  const fetch = async (req: Request) => {
    const body = req.method === 'GET' || req.method === 'HEAD' ? Promise.resolve(null) : req.text();
    seen.push({ method: req.method, url: req.url, headers: Object.fromEntries(req.headers), body, at: now(), signal: req.signal });
    const r = script[Math.min(i++, script.length - 1)];
    if (r instanceof Error) throw r;
    if (r === 'hang') return new Promise<Response>(() => {});
    const [status, data, headers] = typeof r === 'number' ? [r] : r;
    const text = data === undefined ? null : typeof data === 'string' ? data : JSON.stringify(data);
    return new Response(status === 204 ? null : text, { status, headers });
  };
  return { seen, fetch };
}

const settle = (p: Promise<unknown>) => p.then((v) => ({ ok: v }), (e: unknown) => ({ err: e as Error & { response?: Response } }));

export const tests: TestCase<M>[] = [
  {
    group: 'Requests',
    title: 'prefixUrl, searchParams and .json()',
    async run({ createApi }, { expect }) {
      const s = server([[200, { id: 1 }]]);
      const api = createApi({ fetch: s.fetch, prefixUrl: 'https://api.test/v1/' });
      expect(await api.get('/users', { searchParams: { page: 2, q: undefined, active: true } }).json()).toEqual({ id: 1 });
      await api.get('items?x=0', { searchParams: '?a=1&b=2' }).text();
      await api.get('items', { searchParams: new URLSearchParams([['t', 'a b']]) });
      expect(s.seen.map((r) => `${r.method} ${r.url}`)).toEqual([
        'GET https://api.test/v1/users?page=2&active=true',
        'GET https://api.test/v1/items?x=0&a=1&b=2',
        'GET https://api.test/v1/items?t=a+b',
      ]);
      const plain = createApi({ fetch: s.fetch });
      await plain.delete('https://other.test/x');
      expect(s.seen[3].url, 'no prefix').toBe('https://other.test/x');
    },
  },
  {
    group: 'Requests',
    title: 'json bodies, .text(), and empty bodies',
    async run({ createApi }, { expect }) {
      const s = server([[201, 'created'], [200, ''], [204], [200, { ok: true }]]);
      const api = createApi({ fetch: s.fetch });
      expect(await api.post('https://a.test/x', { json: { n: 1 } }).text()).toBe('created');
      expect([s.seen[0].method, await s.seen[0].body, s.seen[0].headers['content-type']]).toEqual(['POST', '{"n":1}', 'application/json']);
      expect(await api.get('https://a.test/empty').json(), 'empty 200 body').toBe(undefined);
      expect(await api.put('https://a.test/x', { json: [1], headers: { 'Content-Type': 'application/vnd.x+json' } }).json(), '204').toBe(undefined);
      expect(s.seen[2].headers['content-type'], 'a content-type you set is kept').toBe('application/vnd.x+json');
      const res = await api.get('https://a.test/raw');
      expect(res).toBeInstanceOf(Response);
      expect(await res.json()).toEqual({ ok: true });
    },
  },
  {
    group: 'Requests',
    title: 'a non-2xx response throws HTTPError with the response attached',
    async run({ createApi, HTTPError }, { expect }) {
      const s = server([[404, { error: 'missing' }]]);
      const api = createApi({ fetch: s.fetch });
      const r = await settle(api.get('https://a.test/nope').json());
      expect('err' in r && r.err).toBeInstanceOf(HTTPError);
      const err = (r as { err: InstanceType<typeof HTTPError> }).err;
      expect([err.name, err.response.status, err.request.url]).toEqual(['HTTPError', 404, 'https://a.test/nope']);
      expect(await err.response.json()).toEqual({ error: 'missing' });
      expect(s.seen.length, '404 is not retried').toBe(1);
    },
  },
  {
    group: 'Retries',
    title: 'idempotent requests retry 5xx with backoff, up to the limit',
    async run({ createApi, HTTPError }, { expect, clock }) {
      const c = clock();
      const s = server([503, 500, [200, 'ok']], c.now);
      const api = createApi({ fetch: s.fetch, clock: c });
      const p = api.get('https://a.test/x').text();
      await c.advance(1000);
      expect(await p).toBe('ok');
      expect(s.seen.map((r) => r.at), 'waits 300 then 600 ms').toEqual([0, 300, 900]);
      const s2 = server([502], c.now);
      const r = settle(createApi({ fetch: s2.fetch, clock: c, retry: 1 }).get('https://a.test/x'));
      await c.advance(1000);
      const out = await r;
      expect('err' in out && out.err).toBeInstanceOf(HTTPError);
      expect([s2.seen.length, (out as { err: { response: Response } }).err.response.status]).toEqual([2, 502]);
    },
  },
  {
    group: 'Retries',
    title: 'POST and 4xx are not retried unless configured',
    async run({ createApi }, { expect, clock }) {
      const c = clock();
      const s = server([503, 400, 503, [200, 'ok']], c.now);
      const api = createApi({ fetch: s.fetch, clock: c });
      const a = settle(api.post('https://a.test/x', { json: {} }));
      await c.advance(5000);
      expect(((await a) as { err: { response: Response } }).err.response.status).toBe(503);
      const b = settle(api.get('https://a.test/x'));
      await c.advance(5000);
      expect(((await b) as { err: { response: Response } }).err.response.status, '400 is final').toBe(400);
      const p = api.post('https://a.test/x', { json: {}, retry: { methods: ['post'] } }).text();
      await c.advance(5000);
      expect(await p).toBe('ok');
      expect(s.seen.map((r) => r.method)).toEqual(['POST', 'GET', 'POST', 'POST']);
      expect(await s.seen[3].body, 'the body is sent again on retry').toBe('{}');
    },
  },
  {
    group: 'Retries',
    title: 'Retry-After in seconds or as an HTTP date, and maxRetryAfter',
    async run({ createApi }, { expect, clock }) {
      const c = clock();
      const s = server([[429, '', { 'Retry-After': '2' }], [503, '', { 'retry-after': 'Thu, 01 Jan 1970 00:00:05 GMT' }], [200, 'ok']], c.now);
      const p = createApi({ fetch: s.fetch, clock: c }).get('https://a.test/x').text();
      await c.advance(10_000);
      expect(await p).toBe('ok');
      expect(s.seen.map((r) => r.at)).toEqual([0, 2000, 5000]);
      const s2 = server([[429, '', { 'Retry-After': '120' }], [200, 'ok']], c.now);
      const r = settle(createApi({ fetch: s2.fetch, clock: c, retry: { maxRetryAfter: 60_000 } }).get('https://a.test/x'));
      await c.advance(0);
      const out = await r;
      expect([s2.seen.length, (out as { err: { response: Response } }).err.response.status], 'gives up instead of waiting 2 minutes').toEqual([1, 429]);
    },
  },
  {
    group: 'Retries',
    title: 'network errors are retried for idempotent methods',
    async run({ createApi }, { expect, clock }) {
      const c = clock();
      const s = server([new TypeError('Failed to fetch'), [200, 'ok']], c.now);
      const p = createApi({ fetch: s.fetch, clock: c }).get('https://a.test/x').text();
      await c.advance(300);
      expect(await p).toBe('ok');
      const s2 = server([new TypeError('Failed to fetch')], c.now);
      const r = await settle(createApi({ fetch: s2.fetch, clock: c }).post('https://a.test/x'));
      expect([(r as { err: Error }).err.message, s2.seen.length]).toEqual(['Failed to fetch', 1]);
    },
  },
  {
    group: 'Hooks',
    title: 'beforeRequest can change the request or answer it',
    async run({ createApi }, { expect }) {
      const s = server([[200, 'from server']]);
      const api = createApi({
        fetch: s.fetch,
        hooks: {
          beforeRequest: [
            (req) => { req.headers.set('authorization', 'Bearer t1'); },
            (req) => (new URL(req.url).pathname === '/cached' ? new Response('from hook') : undefined),
            (req) => new Request(req.url + '?v=2', req),
          ],
        },
      });
      expect(await api.get('https://a.test/cached').text()).toBe('from hook');
      expect(s.seen.length, 'fetch was skipped').toBe(0);
      expect(await api.get('https://a.test/live').text()).toBe('from server');
      expect([s.seen[0].url, s.seen[0].headers.authorization]).toEqual(['https://a.test/live?v=2', 'Bearer t1']);
    },
  },
  {
    group: 'Hooks',
    title: 'afterResponse can replace the response; beforeError can change the error',
    async run({ createApi }, { expect }) {
      const s = server([401, [200, 'secret'], 500]);
      const api = createApi({
        fetch: s.fetch,
        retry: 0,
        hooks: {
          afterResponse: [
            async (req, res) => (res.status === 401 ? s.fetch(new Request(req, { headers: { authorization: 'fresh' } })) : undefined),
          ],
          beforeError: [
            (e) => { e.message = `API ${e.response.status}`; return e; },
          ],
        },
      });
      expect(await api.get('https://a.test/me').text()).toBe('secret');
      expect(s.seen[1].headers.authorization).toBe('fresh');
      const r = await settle(api.get('https://a.test/boom'));
      expect((r as { err: Error }).err.message).toBe('API 500');
    },
  },
  {
    group: 'Timeouts and extend',
    title: 'timeouts and your own AbortSignal',
    async run({ createApi, TimeoutError }, { expect, clock }) {
      const c = clock();
      const s = server(['hang'], c.now);
      const api = createApi({ fetch: s.fetch, clock: c, timeout: 1000 });
      const r = settle(api.get('https://a.test/slow'));
      await c.advance(999);
      expect(s.seen[0].signal.aborted).toBe(false);
      await c.advance(1);
      const out = await r;
      expect((out as { err: Error }).err).toBeInstanceOf(TimeoutError);
      expect([(out as { err: Error }).err.name, s.seen.length, s.seen[0].signal.aborted], 'not retried; fetch aborted').toEqual(['TimeoutError', 1, true]);
      const ac = new AbortController();
      const r2 = settle(api.get('https://a.test/slow', { signal: ac.signal }));
      await c.advance(10);
      ac.abort('navigated away');
      expect((await r2) as unknown).toEqual({ err: 'navigated away' });
      expect(s.seen[1].signal.aborted).toBe(true);
      const s3 = server([503], c.now);
      const ac3 = new AbortController();
      const r3 = settle(createApi({ fetch: s3.fetch, clock: c }).get('https://a.test/x', { signal: ac3.signal }));
      let settled = false;
      void r3.then(() => { settled = true; });
      await c.advance(100);
      ac3.abort('stop');
      await c.advance(0);
      expect(settled, 'rejects right away, without waiting out the retry delay').toBe(true);
      expect(c.pendingTimers(), 'the retry timer is cleared').toBe(0);
      expect([(await r3) as unknown, s3.seen.length], 'abort while waiting to retry').toEqual([{ err: 'stop' }, 1]);
    },
  },
  {
    group: 'Timeouts and extend',
    title: 'extend merges headers case-insensitively and adds hooks',
    async run({ createApi }, { expect }) {
      const s = server([200]);
      const log: string[] = [];
      const base = createApi({ fetch: s.fetch, headers: { 'X-App': 'web', Authorization: 'a' }, hooks: { beforeRequest: [() => { log.push('base'); }] } });
      const child = base.extend({ headers: { 'x-app': 'admin', authorization: undefined, 'X-Extra': '1' }, hooks: { beforeRequest: [() => { log.push('child'); }] } });
      await child.get('https://a.test/x', { headers: { 'X-EXTRA': '2' } });
      await base.get('https://a.test/x');
      expect(s.seen[0].headers).toEqual({ 'x-app': 'admin', 'x-extra': '2' });
      expect(s.seen[1].headers, 'the parent is unchanged').toEqual({ 'x-app': 'web', authorization: 'a' });
      expect(log).toEqual(['base', 'child', 'base']);
    },
  },
];
