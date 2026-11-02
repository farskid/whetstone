import type { TestCase } from '../../runner/types';
import type { Location } from './types';
type M = typeof import('./solution');

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

const href = (l: Location) => l.pathname + l.search + l.hash;

export const tests: TestCase<M>[] = [
  {
    group: 'Locations',
    title: 'parsePath splits a string',
    run({ parsePath }, { expect }) {
      expect(parsePath('/a/b?x=1&y=2#top')).toEqual({ pathname: '/a/b', search: '?x=1&y=2', hash: '#top' });
      expect(parsePath('/a#h?not-search')).toEqual({ pathname: '/a', hash: '#h?not-search' });
      expect(parsePath('?q=2')).toEqual({ search: '?q=2' });
      expect(parsePath('#x')).toEqual({ hash: '#x' });
      expect(parsePath('')).toEqual({});
    },
  },
  {
    group: 'Locations',
    title: 'initial entries and resolving partial paths',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory({ initialEntries: ['/a', { pathname: '/b', search: '?x=1', state: { from: 'a' } }, '/c'], initialIndex: 1 });
      expect([h.index, h.length, h.action]).toEqual([1, 3, 'POP']);
      expect(h.location).toEqual({ pathname: '/b', search: '?x=1', hash: '', state: { from: 'a' }, key: h.location.key });
      expect(createMemoryHistory().location.pathname).toBe('/');
      expect(createMemoryHistory({ initialEntries: ['/a', '/b'] }).index, 'defaults to the last entry').toBe(1);
      expect(createMemoryHistory({ initialEntries: ['/a', '/b'], initialIndex: 9 }).index).toBe(1);
      expect(h.createHref('?y=2')).toBe('/b?y=2');
      expect(h.createHref('#top'), 'search is not carried over').toBe('/b#top');
      expect(h.createHref({ hash: '#h' })).toBe('/b#h');
      expect(h.createHref({ pathname: '/z', search: '?' })).toBe('/z');
      expect(h.createHref('/p?#')).toBe('/p');
    },
  },
  {
    group: 'The stack',
    title: 'push and replace',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory();
      const k0 = h.location.key;
      h.push('/a', { n: 1 });
      expect([h.index, h.length, h.action, h.location.state]).toEqual([1, 2, 'PUSH', { n: 1 }]);
      h.push('?page=2');
      expect(href(h.location)).toBe('/a?page=2');
      expect(h.location.state).toBe(null);
      const k2 = h.location.key;
      h.replace('/b');
      expect([h.index, h.length, h.action, href(h.location)]).toEqual([2, 3, 'REPLACE', '/b']);
      expect(new Set([k0, k2, h.location.key, h.location.key]).size, 'replace makes a new key').toBe(3);
      h.push('/a');
      h.push('/a');
      const keys = new Set<string>();
      for (let i = 0; i < h.length; i++) {
        keys.add(h.location.key);
        h.back();
      }
      expect(keys.size, 'same path, different keys').toBe(5);
    },
  },
  {
    group: 'The stack',
    title: 'go clamps; a no-op go does nothing; push cuts the forward entries',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory({ initialEntries: ['/0', '/1', '/2', '/3'], initialIndex: 0 });
      const seen: string[] = [];
      h.listen((u) => seen.push(`${u.action} ${u.location.pathname}`));
      h.go(2);
      h.go(99);
      h.forward();
      h.go(-1.7);
      h.back();
      h.go(0);
      expect(seen).toEqual(['POP /2', 'POP /3', 'POP /2', 'POP /1']);
      h.push('/x');
      expect([h.index, h.length]).toEqual([2, 3]);
      h.forward();
      expect(h.location.pathname).toBe('/x');
      h.go(-10);
      expect(h.location.pathname).toBe('/0');
    },
  },
  {
    group: 'The stack',
    title: 'listeners can unsubscribe',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory();
      const a: string[] = [];
      const b: string[] = [];
      const offA = h.listen((u) => a.push(u.action));
      h.listen((u) => b.push(`${u.action} ${u.location.pathname} ${h.location.pathname}`));
      h.push('/1');
      offA();
      offA();
      h.replace('/2');
      expect(a).toEqual(['PUSH']);
      expect(b, 'listeners see the new location').toEqual(['PUSH /1 /1', 'REPLACE /2 /2']);
    },
  },
  {
    group: 'Blocking',
    title: 'a blocker stops navigation until retry',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory();
      const heard: string[] = [];
      h.listen((u) => heard.push(u.location.pathname));
      const txs: { action: string; path: string; retry(): void }[] = [];
      const unblock = h.block((tx) => {
        txs.push({ action: tx.action, path: tx.location.pathname, retry: tx.retry });
      });
      h.push('/form', { draft: true });
      expect([h.location.pathname, h.length, heard.length]).toEqual(['/', 1, 0]);
      expect(txs.map((t) => [t.action, t.path])).toEqual([['PUSH', '/form']]);
      txs[0].retry();
      expect(h.location.pathname, 'retry approves and the push happens').toBe('/form');
      expect(h.location.state).toEqual({ draft: true });
      expect(txs).toHaveLength(1);
      txs[0].retry();
      expect(h.length, 'a second retry does nothing').toBe(2);
      h.back();
      expect([h.index, txs[1].action, txs[1].path]).toEqual([1, 'POP', '/']);
      unblock();
      h.back();
      expect(h.index).toBe(0);
      expect(heard).toEqual(['/form', '/']);
    },
  },
  {
    group: 'Blocking',
    title: 'a newer navigation makes old transitions stale',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory();
      const retries: (() => void)[] = [];
      h.block((tx) => {
        retries.push(tx.retry);
      });
      h.push('/a');
      h.push('/b');
      retries[0]();
      expect(h.length, 'stale: /b was attempted after /a').toBe(1);
      retries[1]();
      expect(h.location.pathname).toBe('/b');
      h.go(0);
      expect(retries, 'a no-op go asks nobody').toHaveLength(2);
    },
  },
  {
    group: 'Blocking',
    title: 'several blockers in order; retry asks only the rest',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory();
      const log: string[] = [];
      let retryA: () => void = () => {};
      let retryB: () => void = () => {};
      let allowA = false;
      h.block((tx) => {
        log.push('A');
        retryA = tx.retry;
        return allowA;
      });
      const offB = h.block((tx) => {
        log.push('B');
        retryB = tx.retry;
      });
      h.block(() => {
        log.push('C');
        return true;
      });
      h.push('/1');
      expect(log, 'A blocks, B and C are not asked').toEqual(['A']);
      retryA();
      expect(log).toEqual(['A', 'B']);
      retryB();
      expect(log, 'A is not asked again').toEqual(['A', 'B', 'C']);
      expect(h.location.pathname).toBe('/1');
      log.length = 0;
      allowA = true;
      h.push('/2');
      expect(log).toEqual(['A', 'B']);
      offB();
      retryB();
      expect(log, 'retry after unblocking: B approved itself, C still asked').toEqual(['A', 'B', 'C']);
      expect(h.location.pathname).toBe('/2');
      allowA = false;
      log.length = 0;
      h.push('/3');
      const offAll = h.block(() => true);
      offAll();
      expect(h.location.pathname).toBe('/2');
      expect(log).toEqual(['A']);
    },
  },
  {
    group: 'Scroll and limits',
    title: 'scroll positions are per entry',
    run({ createMemoryHistory }, { expect }) {
      const h = createMemoryHistory();
      h.saveScroll(100);
      const k0 = h.location.key;
      h.push('/a');
      expect(h.getScroll()).toBe(undefined);
      h.saveScroll(250);
      const ka = h.location.key;
      h.push('/b');
      h.saveScroll(30);
      h.back();
      expect(h.getScroll()).toBe(250);
      h.back();
      expect(h.getScroll()).toBe(100);
      expect(h.getScroll(ka)).toBe(250);
      h.push('/c');
      expect(h.getScroll(ka), 'cut off by the push').toBe(undefined);
      h.saveScroll(5);
      h.replace('/d');
      expect(h.getScroll(), 'a replace is a fresh entry').toBe(undefined);
      h.back();
      expect(h.getScroll()).toBe(100);
      expect(h.getScroll(k0)).toBe(100);
      h.push('/same');
      h.saveScroll(1);
      h.push('/same');
      h.saveScroll(2);
      h.back();
      expect(h.getScroll(), 'two entries with the same path keep separate positions').toBe(1);
    },
  },
  {
    group: 'Scroll and limits',
    title: 'maxLength drops the oldest entries',
    run({ createMemoryHistory }, { expect }) {
      expect(thrown(() => createMemoryHistory({ maxLength: 0 }))).toBeInstanceOf(RangeError);
      expect(thrown(() => createMemoryHistory({ maxLength: 2.5 }))).toBeInstanceOf(RangeError);
      const h = createMemoryHistory({ maxLength: 3 });
      h.saveScroll(1);
      const k0 = h.location.key;
      h.push('/a');
      h.push('/b');
      expect([h.index, h.length]).toEqual([2, 3]);
      h.push('/c');
      expect([h.index, h.length]).toEqual([2, 3]);
      expect(h.getScroll(k0), 'scroll for dropped entries is gone').toBe(undefined);
      h.go(-5);
      expect(h.location.pathname).toBe('/a');
      h.push('/d');
      expect([h.index, h.length], 'pushing in the middle cuts first, so nothing is dropped').toEqual([1, 2]);
    },
  },
];
