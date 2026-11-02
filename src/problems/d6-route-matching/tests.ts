import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Static and params';
const G2 = 'Specificity and wildcards';
const G3 = 'Constraints and optional params';
const G4 = 'Methods and reverse routing';

const throws = (fn: () => unknown) => { try { fn(); } catch { return true; } return false; };

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'static routes and the root',
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/', 'home');
      r.add('GET', '/about/team', 'team');
      expect(r.match('GET', '/')).toEqual({ handler: 'home', params: {}, pattern: '/' });
      expect(r.match('GET', '/about/team')?.handler).toBe('team');
      expect(r.match('GET', '/about')).toBeNull();
      expect(r.match('GET', '/About/team'), 'case-sensitive').toBeNull();
    },
  },
  {
    group: G1,
    title: 'params are captured and decoded',
    input: "'/users/:id/posts/:postId' with '/users/j%C3%B6rg/posts/7'",
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/users/:id/posts/:postId', 'post');
      expect(r.match('GET', '/users/j%C3%B6rg/posts/7')?.params).toEqual({ id: 'jörg', postId: '7' });
      expect(r.match('GET', '/users/%E0%A4%A/posts/1')?.params.id, 'malformed encoding stays raw').toBe('%E0%A4%A');
      expect(r.match('GET', '/users/1/posts')).toBeNull();
    },
  },
  {
    group: G1,
    title: 'query, hash, trailing and duplicate slashes are ignored',
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/a/:b', 'x');
      for (const p of ['/a/1?x=2', '/a/1#top', '/a/1/', '//a//1', '/a/1/?q#h']) {
        expect(r.match('GET', p)?.params, p).toEqual({ b: '1' });
      }
    },
  },
  {
    group: G2,
    title: 'static beats param regardless of registration order',
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/users/:id', 'byId');
      r.add('GET', '/users/me', 'me');
      expect(r.match('GET', '/users/me')?.handler).toBe('me');
      expect(r.match('GET', '/users/5')?.handler).toBe('byId');
    },
  },
  {
    group: G2,
    title: 'param beats wildcard; wildcard captures the rest',
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/files/*', 'rest');
      r.add('GET', '/files/:name', 'one');
      expect(r.match('GET', '/files/a.txt')?.handler).toBe('one');
      expect(r.match('GET', '/files/a/b%20c/d.txt')).toEqual({ handler: 'rest', params: { '*': 'a/b c/d.txt' }, pattern: '/files/*' });
      expect(r.match('GET', '/files')?.params, 'zero segments').toEqual({ '*': '' });
    },
  },
  {
    group: G2,
    title: 'backtracks when the most specific branch dead-ends',
    input: "routes '/a/:x/c' and '/a/b/d'; path '/a/b/c'",
    run({ createRouter }, { expect }) {
      const r = createRouter<number>();
      r.add('GET', '/a/:x/c', 1);
      r.add('GET', '/a/b/d', 2);
      r.add('GET', '/a/*', 3);
      expect(r.match('GET', '/a/b/c')?.handler).toBe(1);
      expect(r.match('GET', '/a/b/d')?.handler).toBe(2);
      expect(r.match('GET', '/a/b/e')?.handler).toBe(3);
    },
  },
  {
    group: G3,
    title: 'constraints must match the whole segment',
    input: "'/u/:id(\\d+)' and '/u/:slug'",
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/u/:id(\\d+)', 'num');
      r.add('GET', '/u/:slug', 'slug');
      expect(r.match('GET', '/u/123')?.handler).toBe('num');
      expect(r.match('GET', '/u/123abc')?.handler, 'not anchored = bug').toBe('slug');
      expect(r.match('GET', '/u/abc')?.params).toEqual({ slug: 'abc' });
    },
  },
  {
    group: G3,
    title: 'constraint alternation is fully anchored',
    input: "'/:lang(en|fi)/docs'",
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/:lang(en|fi)/docs', 'docs');
      expect(r.match('GET', '/fi/docs')?.params).toEqual({ lang: 'fi' });
      expect(r.match('GET', '/xfi/docs')).toBeNull();
      expect(r.match('GET', '/enx/docs')).toBeNull();
    },
  },
  {
    group: G3,
    title: 'optional params: present or absent (no key when absent)',
    input: "'/posts/:year(\\d{4})?/:slug'",
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/posts/:year(\\d{4})?/:slug', 'post');
      expect(r.match('GET', '/posts/2024/hello')?.params).toEqual({ year: '2024', slug: 'hello' });
      const m = r.match('GET', '/posts/hello');
      expect(m?.params).toEqual({ slug: 'hello' });
      expect(Object.keys(m?.params ?? {})).toEqual(['slug']);
      expect(m?.pattern).toBe('/posts/:year(\\d{4})?/:slug');
    },
  },
  {
    group: G4,
    title: 'methods: exact method beats ALL; unknown method does not match',
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('ALL', '/x', 'all');
      r.add('POST', '/x', 'post');
      r.add('GET', '/y', 'gety');
      expect(r.match('POST', '/x')?.handler).toBe('post');
      expect(r.match('DELETE', '/x')?.handler).toBe('all');
      expect(r.match('get', '/y')?.handler, 'methods are case-insensitive on input').toBe('gety');
      expect(r.match('PUT', '/y')).toBeNull();
    },
  },
  {
    group: G4,
    title: 'allowedMethods() for 405 responses',
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/items/:id', 'g');
      r.add('PUT', '/items/:id', 'p');
      r.add('DELETE', '/items/special', 'd');
      r.add('ALL', '/any/*', 'a');
      expect(r.allowedMethods('/items/5')).toEqual(['GET', 'PUT']);
      expect(r.allowedMethods('/items/special'), 'every matching route counts').toEqual(['DELETE', 'GET', 'PUT']);
      expect(r.allowedMethods('/any/thing')).toEqual(['ALL']);
      expect(r.allowedMethods('/nope')).toEqual([]);
    },
  },
  {
    group: G4,
    title: 'duplicate and malformed patterns throw',
    run({ createRouter }, { expect }) {
      const r = createRouter<string>();
      r.add('GET', '/u/:id', 'a');
      expect(throws(() => r.add('GET', '/u/:name', 'b')), 'same shape, different param name').toBe(true);
      expect(throws(() => r.add('POST', '/u/:name', 'b')), 'other method is fine').toBe(false);
      expect(throws(() => r.add('GET', '/u/:id(\\d+)', 'c')), 'different constraint is fine').toBe(false);
      for (const bad of ['/a/*/b', '/a/:', '/a/:x/:x', '/a/:x([)']) {
        expect(throws(() => r.add('GET', bad, 'z')), bad).toBe(true);
      }
    },
  },
  {
    group: G4,
    title: 'buildPath fills, encodes and validates',
    run({ buildPath }, { expect }) {
      expect(buildPath('/users/:id(\\d+)/:tab?', { id: 7 })).toBe('/users/7');
      expect(buildPath('/users/:id(\\d+)/:tab?', { id: 7, tab: 'a b' })).toBe('/users/7/a%20b');
      expect(buildPath('/files/*', { '*': 'a b/c.txt' })).toBe('/files/a%20b/c.txt');
      expect(buildPath('/q/:term', { term: 'x/y?z' })).toBe('/q/x%2Fy%3Fz');
      expect(buildPath('/', {})).toBe('/');
      expect(throws(() => buildPath('/users/:id', {})), 'missing required').toBe(true);
      expect(throws(() => buildPath('/users/:id(\\d+)', { id: 'abc' })), 'constraint').toBe(true);
    },
  },
  {
    group: G4,
    title: 'round trip: buildPath then match gives the params back',
    run({ createRouter, buildPath }, { expect }) {
      const r = createRouter<string>();
      const pattern = '/shop/:cat/:item?/*';
      r.add('GET', pattern, 'shop');
      const params = { cat: 'tea & coffee', item: 'ü', '*': 'x/y z' };
      expect(r.match('GET', buildPath(pattern, params))?.params).toEqual(params);
    },
  },
  {
    group: G4,
    title: 'many routes: matching stays fast',
    input: '2,000 routes, 20,000 lookups',
    run({ createRouter }, { expect }) {
      const r = createRouter<number>();
      for (let i = 0; i < 1000; i++) { r.add('GET', `/r${i}/:id`, i); r.add('GET', `/r${i}/:id/edit`, -i); }
      const start = Date.now();
      let sum = 0;
      for (let i = 0; i < 20_000; i++) sum += r.match('GET', `/r${i % 1000}/x/edit`)!.handler;
      expect(sum).toBe(-((999 * 1000) / 2) * 20);
      expect(Date.now() - start, 'ms (a linear scan over all routes is too slow)').toBeLessThan(500);
    },
  },
];
