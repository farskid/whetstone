import type { TestCase, TestContext } from '../../runner/types';
type M = typeof import('./solution');
type Clock = ReturnType<TestContext['clock']>;
type Res = { status: number; headers: Record<string, string>; body: string };
type Req = { url: string; method: string; headers: Record<string, string> };

const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);
const httpDate = (ms: number) => new Date(ms).toUTCString();

/** A scripted origin server: each request takes the next queued reply. */
function origin(c: Clock) {
  const requests: Req[] = [];
  const queue: (Res | Error | (() => Res | Promise<Res>))[] = [];
  const fetch = async (req: Req): Promise<Res> => {
    requests.push({ ...req, headers: { ...req.headers } });
    const next = queue.shift();
    if (next === undefined) throw new Error(`unexpected request to ${req.url}`);
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next() : next;
  };
  /** Queue a reply; a Date header for "now" is added unless given. */
  const reply = (status: number, headers: Record<string, string>, body = '') =>
    queue.push({ status, headers: { date: httpDate(c.now()), ...headers }, body });
  return { requests, queue, fetch, reply };
}

const settle = (p: Promise<{ cache: string; body: string; status: number }>) =>
  p.then((r) => `${r.cache} ${r.status} ${r.body}`, (e: Error) => `error ${e.message}`);

export const tests: TestCase<M>[] = [
  {
    group: 'Freshness',
    title: 'serves from the cache while max-age lasts, then fetches again',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      o.reply(200, { 'cache-control': 'max-age=60' }, 'v1');
      const first = await cache.fetch({ url: '/a' });
      expect(first.cache).toBe('MISS');
      expect(first.body).toBe('v1');
      c.tick(10_000);
      const hit = await cache.fetch({ url: '/a' });
      expect([hit.cache, hit.status, hit.body]).toEqual(['HIT', 200, 'v1']);
      expect(hit.headers.age, 'Age header in whole seconds').toBe('10');
      c.tick(49_500);
      expect((await cache.fetch({ url: '/a' })).headers.age).toBe('59');
      c.tick(500);
      o.reply(200, { 'cache-control': 'max-age=60' }, 'v2');
      const again = await cache.fetch({ url: '/a' });
      expect([again.cache, again.body], 'at exactly 60 s it is stale').toEqual(['MISS', 'v2']);
      expect(o.requests.length).toBe(2);
      expect(o.requests[1].headers['if-none-match'], 'no validators to send').toBe(undefined);
      expect(o.requests[1].method).toBe('GET');
    },
  },
  {
    group: 'Freshness',
    title: 'caches only GET responses with cacheable statuses; unsafe methods invalidate',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      o.reply(500, { 'cache-control': 'max-age=60' }, 'oops');
      o.reply(200, { 'cache-control': 'max-age=60' }, 'ok');
      expect(await settle(cache.fetch({ url: '/a' }))).toBe('MISS 500 oops');
      expect(await settle(cache.fetch({ url: '/a' })), 'a 500 is not stored').toBe('MISS 200 ok');
      expect(await settle(cache.fetch({ url: '/a' }))).toBe('HIT 200 ok');
      o.reply(404, { 'cache-control': 'max-age=60' }, 'gone');
      expect(await settle(cache.fetch({ url: '/missing' }))).toBe('MISS 404 gone');
      expect(await settle(cache.fetch({ url: '/missing' })), 'a 404 is stored').toBe('HIT 404 gone');
      o.reply(200, { 'cache-control': 'max-age=60' }, 'b');
      expect(await settle(cache.fetch({ url: '/b' })), 'other URLs are separate').toBe('MISS 200 b');

      o.reply(400, {}, 'bad');
      expect(await settle(cache.fetch({ url: '/a', method: 'post' }))).toBe('MISS 400 bad');
      expect(o.requests[o.requests.length - 1].method).toBe('POST');
      expect(await settle(cache.fetch({ url: '/a' })), 'a failed POST does not invalidate').toBe('HIT 200 ok');
      o.reply(201, { 'cache-control': 'max-age=60' }, 'created');
      expect(await settle(cache.fetch({ url: '/a', method: 'PUT' }))).toBe('MISS 201 created');
      o.reply(200, { 'cache-control': 'max-age=60' }, 'ok2');
      expect(await settle(cache.fetch({ url: '/a' })), 'a successful PUT drops /a').toBe('MISS 200 ok2');
      expect(await settle(cache.fetch({ url: '/b' })), '/b is untouched').toBe('HIT 200 b');
    },
  },
  {
    group: 'Freshness',
    title: 'falls back to Expires, then to the Last-Modified heuristic',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      o.reply(200, { expires: httpDate(T0 + 120_000) }, 'e');
      o.reply(200, { expires: 'soon', 'last-modified': httpDate(T0 - 10 * 86_400_000) }, 'bad1');
      o.reply(200, { expires: httpDate(T0 + 3_600_000), 'cache-control': 'max-age=10' }, 'm');
      o.reply(200, { 'last-modified': httpDate(T0 - 10 * 86_400_000) }, 'h');
      o.reply(200, {}, 'none1');
      await cache.fetch({ url: '/e' });
      await cache.fetch({ url: '/bad' });
      await cache.fetch({ url: '/m' });
      await cache.fetch({ url: '/h' });
      await cache.fetch({ url: '/none' });
      o.reply(200, {}, 'bad2');
      o.reply(200, {}, 'none2');
      expect(await settle(cache.fetch({ url: '/bad' })), 'an invalid Expires means already stale').toBe('MISS 200 bad2');
      expect(await settle(cache.fetch({ url: '/none' })), 'no freshness information').toBe('MISS 200 none2');
      c.tick(10_000);
      o.reply(200, {}, 'm2');
      expect(await settle(cache.fetch({ url: '/m' })), 'max-age wins over Expires').toBe('MISS 200 m2');
      c.tick(109_000);
      expect(await settle(cache.fetch({ url: '/e' }))).toBe('HIT 200 e');
      c.tick(1000);
      o.reply(200, {}, 'e2');
      expect(await settle(cache.fetch({ url: '/e' })), 'Expires minus Date is 120 s').toBe('MISS 200 e2');
      c.tick(23 * 3_600_000 - 120_000);
      expect(await settle(cache.fetch({ url: '/h' })), '10% of 10 days is 1 day').toBe('HIT 200 h');
      c.tick(3_600_000);
      o.reply(200, {}, 'h2');
      expect(await settle(cache.fetch({ url: '/h' })), 'stale after 1 day').toBe('MISS 200 h2');
    },
  },
  {
    group: 'Freshness',
    title: 'computes the age from the Age header, the Date header and the response delay',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      o.reply(200, { age: '30', 'cache-control': 'max-age=60' }, 'aged');
      o.reply(200, { date: httpDate(T0 - 20_000), 'cache-control': 'max-age=60' }, 'dated');
      o.queue.push(() => {
        c.tick(5000);
        return { status: 200, headers: { date: httpDate(c.now()), age: '10', 'cache-control': 'max-age=60' }, body: 'slow' };
      });
      o.reply(200, { date: httpDate(T0 - 20_000), age: '30', 'cache-control': 'max-age=60' }, 'both');
      await cache.fetch({ url: '/aged' });
      await cache.fetch({ url: '/dated' });
      await cache.fetch({ url: '/slow' });
      await cache.fetch({ url: '/both' });
      expect((await cache.fetch({ url: '/both' })).headers.age, 'the larger of Date and Age, not their sum').toBe('30');
      expect((await cache.fetch({ url: '/slow' })).headers.age, 'Age 10 plus 5 s in flight').toBe('15');
      expect((await cache.fetch({ url: '/aged' })).headers.age).toBe('35');
      expect((await cache.fetch({ url: '/dated' })).headers.age, 'Date was 20 s before the response, plus 5 s since').toBe('25');
      c.tick(24_000);
      expect(await settle(cache.fetch({ url: '/aged' }))).toBe('HIT 200 aged');
      c.tick(1000);
      o.reply(200, {}, 'aged2');
      expect(await settle(cache.fetch({ url: '/aged' }))).toBe('MISS 200 aged2');
      c.tick(9000);
      expect(await settle(cache.fetch({ url: '/dated' }))).toBe('HIT 200 dated');
      c.tick(1000);
      o.reply(200, {}, 'dated2');
      expect(await settle(cache.fetch({ url: '/dated' }))).toBe('MISS 200 dated2');
    },
  },
  {
    group: 'Revalidation',
    title: 'revalidates a stale response with its validators; a 304 refreshes it',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      const lm = httpDate(T0 - 86_400_000);
      o.reply(200, { 'cache-control': 'max-age=10', etag: '"v1"', 'last-modified': lm, 'x-a': '1' }, 'hello');
      await cache.fetch({ url: '/r', headers: { accept: 'text/plain' } });
      c.tick(11_000);
      o.reply(304, { 'cache-control': 'max-age=100', 'x-a': '2' });
      const r = await cache.fetch({ url: '/r', headers: { Accept: 'text/plain' } });
      expect([r.cache, r.status, r.body]).toEqual(['REVALIDATED', 200, 'hello']);
      const sent = o.requests[1].headers;
      expect([sent['if-none-match'], sent['if-modified-since'], sent.accept]).toEqual(['"v1"', lm, 'text/plain']);
      expect([r.headers['x-a'], r.headers.etag, r.headers['cache-control']], '304 headers are merged in').toEqual(['2', '"v1"', 'max-age=100']);
      expect(r.headers.age, 'the age restarts').toBe('0');
      c.tick(99_000);
      expect(await settle(cache.fetch({ url: '/r' })), 'the new max-age applies').toBe('HIT 200 hello');
      c.tick(1000);
      o.reply(304, {});
      expect(await settle(cache.fetch({ url: '/r' }))).toBe('REVALIDATED 200 hello');
      expect(o.requests.length).toBe(3);
    },
  },
  {
    group: 'Revalidation',
    title: 'a 200 to a conditional request replaces the stored response',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      const lm = httpDate(T0 - 86_400_000);
      o.reply(200, { 'cache-control': 'max-age=5', 'last-modified': lm }, 'old');
      await cache.fetch({ url: '/p' });
      c.tick(6000);
      o.reply(200, { 'cache-control': 'max-age=5' }, 'new');
      expect(await settle(cache.fetch({ url: '/p' }))).toBe('MISS 200 new');
      expect(o.requests[1].headers['if-modified-since']).toBe(lm);
      expect(o.requests[1].headers['if-none-match']).toBe(undefined);
      expect(await settle(cache.fetch({ url: '/p' }))).toBe('HIT 200 new');
      c.tick(6000);
      o.reply(200, { 'cache-control': 'max-age=5' }, 'newer');
      expect(await settle(cache.fetch({ url: '/p' }))).toBe('MISS 200 newer');
      expect(o.requests[2].headers['if-modified-since'], 'the old validator is gone').toBe(undefined);
    },
  },
  {
    group: 'Revalidation',
    title: 'no-cache and max-age=0 revalidate on every use',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      o.reply(200, { 'cache-control': 'no-cache, max-age=600', etag: '"n"' }, 'nc');
      o.reply(200, { 'cache-control': 'max-age=0', etag: '"z"' }, 'zero');
      await cache.fetch({ url: '/nc' });
      await cache.fetch({ url: '/zero' });
      for (let i = 0; i < 2; i++) {
        o.reply(304, {});
        o.reply(304, {});
        expect(await settle(cache.fetch({ url: '/nc' }))).toBe('REVALIDATED 200 nc');
        expect(await settle(cache.fetch({ url: '/zero' }))).toBe('REVALIDATED 200 zero');
        c.tick(1000);
      }
      expect(o.requests.map((r) => r.headers['if-none-match'])).toEqual([undefined, undefined, '"n"', '"z"', '"n"', '"z"']);
    },
  },
  {
    group: 'Vary and privacy',
    title: 'keeps a separate variant for each value of the Vary headers',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      const get = (lang?: string, extra: Record<string, string> = {}) =>
        settle(cache.fetch({ url: '/v', headers: lang === undefined ? extra : { 'Accept-Language': lang, ...extra } }));
      o.reply(200, { 'cache-control': 'max-age=60', vary: 'Accept-Language' }, 'hei');
      o.reply(200, { 'cache-control': 'max-age=60', vary: 'accept-language', etag: '"en"' }, 'hello');
      o.reply(200, { 'cache-control': 'max-age=60', vary: 'Accept-Language' }, 'default');
      expect(await get('fi')).toBe('MISS 200 hei');
      expect(await get('en')).toBe('MISS 200 hello');
      expect(await get()).toBe('MISS 200 default');
      expect(await get('fi', { 'X-Other': '1' }), 'other headers do not matter').toBe('HIT 200 hei');
      expect(await settle(cache.fetch({ url: '/v', headers: { 'accept-language': 'en' } })), 'header names are case-insensitive').toBe('HIT 200 hello');
      expect(await get()).toBe('HIT 200 default');
      c.tick(61_000);
      o.reply(200, { 'cache-control': 'max-age=60', vary: 'Accept-Language' }, 'moi');
      expect(await get('fi')).toBe('MISS 200 moi');
      expect(await get('fi')).toBe('HIT 200 moi');
      o.reply(304, {});
      expect(await get('en'), 'the en variant is still stored').toBe('REVALIDATED 200 hello');
      expect(o.requests[o.requests.length - 1].headers['if-none-match']).toBe('"en"');
    },
  },
  {
    group: 'Vary and privacy',
    title: 'respects no-store, Vary: *, private and s-maxage',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const browser = createHttpCache({ fetch: o.fetch, clock: c });
      const cdn = createHttpCache({ fetch: o.fetch, clock: c, shared: true });
      const twice = async (cache: typeof browser, url: string, cc: Record<string, string>) => {
        o.reply(200, cc, '1');
        o.reply(200, cc, '2');
        await cache.fetch({ url });
        const r = await settle(cache.fetch({ url }));
        if (r.startsWith('HIT')) o.queue.pop();
        return r;
      };
      expect(await twice(browser, '/ns', { 'cache-control': 'No-Store, max-age=60' })).toBe('MISS 200 2');
      expect(await twice(browser, '/star', { 'cache-control': 'max-age=60', vary: '*' })).toBe('MISS 200 2');
      expect(await twice(browser, '/case', { 'cache-control': 'Public, MAX-AGE=60' }), 'directives are case-insensitive').toBe('HIT 200 1');
      expect(await twice(browser, '/priv', { 'cache-control': 'private, max-age=60' }), 'a private cache stores private').toBe('HIT 200 1');
      expect(await twice(cdn, '/priv', { 'cache-control': 'private, max-age=60' }), 'a shared cache does not').toBe('MISS 200 2');
      o.reply(200, { 'cache-control': 'max-age=10, s-maxage=100' }, 's');
      o.reply(200, { 'cache-control': 'max-age=10, s-maxage=100' }, 's');
      await browser.fetch({ url: '/s' });
      await cdn.fetch({ url: '/s' });
      c.tick(50_000);
      expect(await settle(cdn.fetch({ url: '/s' })), 's-maxage applies to a shared cache').toBe('HIT 200 s');
      o.reply(200, { 'cache-control': 'max-age=10, s-maxage=100' }, 's2');
      expect(await settle(browser.fetch({ url: '/s' })), 'but not to a private one').toBe('MISS 200 s2');

      o.reply(200, { 'cache-control': 'max-age=10', etag: '"x"' }, 'x1');
      await browser.fetch({ url: '/x' });
      c.tick(11_000);
      o.reply(200, { 'cache-control': 'no-store' }, 'x2');
      expect(await settle(browser.fetch({ url: '/x' }))).toBe('MISS 200 x2');
      o.reply(200, {}, 'x3');
      expect(await settle(browser.fetch({ url: '/x' })), 'a no-store answer removes the old copy').toBe('MISS 200 x3');
      expect(o.requests[o.requests.length - 1].headers['if-none-match']).toBe(undefined);
    },
  },
  {
    group: 'Stale responses',
    title: 'stale-while-revalidate answers at once and revalidates once in the background',
    async run({ createHttpCache }, { expect, clock, flush, deferred }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      const cc = { 'cache-control': 'max-age=10, stale-while-revalidate=30', etag: '"a"' };
      o.reply(200, cc, 'v1');
      await cache.fetch({ url: '/s' });
      c.tick(20_000);
      const d = deferred<Res>();
      o.queue.push(() => d.promise);
      const r1 = await cache.fetch({ url: '/s' });
      expect([r1.cache, r1.body, r1.headers.age]).toEqual(['STALE', 'v1', '20']);
      await flush();
      expect(o.requests.length, 'one background request').toBe(2);
      expect(o.requests[1].headers['if-none-match']).toBe('"a"');
      expect(await settle(cache.fetch({ url: '/s' }))).toBe('STALE 200 v1');
      await flush();
      expect(o.requests.length, 'not a second one').toBe(2);
      d.resolve({ status: 200, headers: { date: httpDate(c.now()), ...cc, etag: '"b"' }, body: 'v2' });
      await flush();
      expect(await settle(cache.fetch({ url: '/s' }))).toBe('HIT 200 v2');

      c.tick(15_000);
      o.queue.push(new Error('offline'));
      expect(await settle(cache.fetch({ url: '/s' }))).toBe('STALE 200 v2');
      await flush();
      o.reply(304, {});
      expect(await settle(cache.fetch({ url: '/s' })), 'a failed background request is forgotten').toBe('STALE 200 v2');
      await flush();
      expect(o.requests.length).toBe(4);
      expect(await settle(cache.fetch({ url: '/s' }))).toBe('HIT 200 v2');

      c.tick(41_000);
      o.reply(200, { 'cache-control': 'max-age=10' }, 'v3');
      expect(await settle(cache.fetch({ url: '/s' })), 'past the window it waits for the origin').toBe('MISS 200 v3');
    },
  },
  {
    group: 'Stale responses',
    title: 'stale-if-error serves the stale copy on network errors and 5xx',
    async run({ createHttpCache }, { expect, clock }) {
      const c = clock(T0);
      const o = origin(c);
      const cache = createHttpCache({ fetch: o.fetch, clock: c });
      o.reply(200, { 'cache-control': 'max-age=10, stale-if-error=60' }, 'v1');
      o.reply(200, { 'cache-control': 'max-age=10, stale-if-error=60, must-revalidate' }, 'm1');
      o.reply(200, { 'cache-control': 'max-age=10' }, 'p1');
      await cache.fetch({ url: '/e' });
      await cache.fetch({ url: '/m' });
      await cache.fetch({ url: '/p' });
      c.tick(20_000);
      o.queue.push(new Error('offline'));
      expect(await settle(cache.fetch({ url: '/e' }))).toBe('STALE 200 v1');
      o.reply(503, {}, 'down');
      expect(await settle(cache.fetch({ url: '/e' }))).toBe('STALE 200 v1');
      o.reply(500, {}, 'down');
      expect(await settle(cache.fetch({ url: '/e' })), 'the stale copy is kept').toBe('STALE 200 v1');
      o.reply(503, {}, 'down');
      expect(await settle(cache.fetch({ url: '/m' })), 'must-revalidate forbids it').toBe('MISS 503 down');
      o.queue.push(new Error('offline'));
      expect(await settle(cache.fetch({ url: '/p' })), 'without the directive the error surfaces').toBe('error offline');
      c.tick(50_000);
      o.queue.push(new Error('offline'));
      expect(await settle(cache.fetch({ url: '/e' })), '70 s past expiry is still allowed').toBe('STALE 200 v1');
      c.tick(1000);
      o.reply(502, {}, 'bad gateway');
      expect(await settle(cache.fetch({ url: '/e' })), 'past the window').toBe('MISS 502 bad gateway');
    },
  },
];
