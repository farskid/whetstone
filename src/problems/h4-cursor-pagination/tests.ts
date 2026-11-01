import type { TestCase } from '../../runner/types';
import type { Page, FeedArgs, Connection } from './solution';
type M = typeof import('./solution');

type Item = { id: number; v?: string };

/** fetchPage backed by a map from cursor ('null' for the first page) to page. */
function book(map: Record<string, Page<Item> | Error>) {
  const calls: (string | null)[] = [];
  const fetchPage = async (cursor: string | null) => {
    calls.push(cursor);
    const p = map[String(cursor)];
    if (!p) throw new Error(`no page for ${cursor}`);
    if (p instanceof Error) throw p;
    return p;
  };
  return { calls, fetchPage };
}
const it = (...ids: number[]): Item[] => ids.map((id) => ({ id }));

async function collect<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of gen) out.push(x);
  return out;
}

/** A Relay server over a newest-first list. Cursors are `c<id>`. */
function relay(ids: number[]) {
  const data = ids.map((id) => ({ id, v: 'v1' }) as Item);
  const calls: FeedArgs[] = [];
  let fail = false;
  const fetchPage = async (args: FeedArgs): Promise<Connection<Item>> => {
    calls.push(args);
    await Promise.resolve();
    if (fail) throw new Error('offline');
    const idx = (c: string) => data.findIndex((d) => `c${d.id}` === c);
    let start: number, end: number;
    if ('first' in args) {
      start = args.after === null ? 0 : idx(args.after) + 1;
      end = Math.min(data.length, start + args.first);
    } else {
      end = idx(args.before);
      start = Math.max(0, end - args.last);
    }
    return {
      edges: data.slice(start, end).map((node) => ({ cursor: `c${node.id}`, node: { ...node } })),
      pageInfo: { hasNextPage: end < data.length, hasPreviousPage: start > 0 },
    };
  };
  return { data, calls, fetchPage, setFail: (f: boolean) => { fail = f; } };
}
const ids = (items: Item[]) => items.map((i) => i.id);

export const tests: TestCase<M>[] = [
  {
    group: 'Paging',
    title: 'yields every item across pages, in order',
    async run({ paginate }, { expect }) {
      const b = book({
        null: { items: it(1, 2), endCursor: 'a', hasNextPage: true },
        a: { items: it(3, 4), endCursor: 'b', hasNextPage: true },
        b: { items: it(5), endCursor: 'c', hasNextPage: false },
      });
      const p = paginate(b.fetchPage);
      expect(b.calls, 'nothing is fetched until you iterate').toEqual([]);
      expect(ids(await collect(p))).toEqual([1, 2, 3, 4, 5]);
      expect(b.calls).toEqual([null, 'a', 'b']);
      expect(p.cursor, 'the last endCursor').toBe('c');
    },
  },
  {
    group: 'Paging',
    title: 'empty pages and startCursor',
    async run({ paginate }, { expect }) {
      const empty = book({ null: { items: [], endCursor: null, hasNextPage: false } });
      expect(await collect(paginate(empty.fetchPage))).toEqual([]);
      const b = book({
        null: { items: [], endCursor: 'a', hasNextPage: true },
        a: { items: it(1), endCursor: 'b', hasNextPage: true },
        b: { items: it(2), endCursor: 'c', hasNextPage: false },
      });
      expect(ids(await collect(paginate(b.fetchPage))), 'an empty page in the middle is skipped over').toEqual([1, 2]);
      expect(ids(await collect(paginate(b.fetchPage, { startCursor: 'a' })))).toEqual([1, 2]);
      expect(b.calls).toEqual([null, 'a', 'b', 'a', 'b']);
    },
  },
  {
    group: 'Paging',
    title: 'break stops fetching',
    async run({ paginate }, { expect }) {
      const b = book({
        null: { items: it(1, 2), endCursor: 'a', hasNextPage: true },
        a: { items: it(3, 4), endCursor: 'b', hasNextPage: true },
        b: { items: it(5), endCursor: null, hasNextPage: false },
      });
      const p = paginate(b.fetchPage);
      const got: number[] = [];
      for await (const x of p) {
        got.push(x.id);
        if (x.id === 3) break;
      }
      expect(got).toEqual([1, 2, 3]);
      expect(b.calls).toEqual([null, 'a']);
      expect(p.cursor, 'page a was not finished, so resuming starts at a again').toBe('a');
      const q = paginate(b.fetchPage);
      for await (const x of q) if (x.id === 2) break;
      expect(q.cursor, 'stopped at the last item of a page: still that page').toBe(null);
    },
  },
  {
    group: 'Dedupe and guards',
    title: 'items are deduped by id across pages',
    async run({ paginate }, { expect }) {
      const b = book({
        null: { items: it(1, 2, 3), endCursor: 'a', hasNextPage: true },
        a: { items: it(3, 4, 4, 5), endCursor: 'b', hasNextPage: true },
        b: { items: it(1, 6), endCursor: null, hasNextPage: false },
      });
      expect(ids(await collect(paginate(b.fetchPage)))).toEqual([1, 2, 3, 4, 5, 6]);
      const byKey = book({
        null: { items: [{ id: 1, v: 'x' }, { id: 2, v: 'x' }, { id: 3, v: 'y' }], endCursor: null, hasNextPage: false },
      });
      const got = await collect(paginate(byKey.fetchPage, { getId: (i) => i.v! }));
      expect(ids(got), 'custom getId').toEqual([1, 3]);
    },
  },
  {
    group: 'Dedupe and guards',
    title: 'a repeated or missing cursor throws instead of looping',
    async run({ paginate }, { expect }) {
      const loop = book({
        null: { items: it(1), endCursor: 'a', hasNextPage: true },
        a: { items: it(2), endCursor: 'b', hasNextPage: true },
        b: { items: it(3), endCursor: 'a', hasNextPage: true },
      });
      const got: number[] = [];
      let error = '';
      try {
        for await (const x of paginate(loop.fetchPage)) got.push(x.id);
      } catch (e) {
        error = (e as Error).message;
      }
      expect(/repeat/i.test(error), 'message mentions the repeat').toBe(true);
      expect([got, loop.calls], "the bad page's items are not yielded").toEqual([[1, 2], [null, 'a', 'b']]);
      const back = book({ s: { items: it(1), endCursor: 's', hasNextPage: true } });
      let e2 = '';
      await collect(paginate(back.fetchPage, { startCursor: 's' })).catch((e: Error) => { e2 = e.message; });
      expect([/repeat/i.test(e2), back.calls.length], 'the start cursor counts as used').toEqual([true, 1]);
      const none = book({ null: { items: it(1), endCursor: null, hasNextPage: true } });
      let e3 = '';
      await collect(paginate(none.fetchPage)).catch((e: Error) => { e3 = e.message; });
      expect([e3 !== '', none.calls.length], 'hasNextPage with no cursor').toEqual([true, 1]);
      const none2 = book({
        s: { items: it(1), endCursor: null, hasNextPage: true },
        null: { items: it(2), endCursor: null, hasNextPage: false },
      });
      let e4 = '';
      await collect(paginate(none2.fetchPage, { startCursor: 's' })).catch((e: Error) => { e4 = e.message; });
      expect([e4 !== '', none2.calls], 'a null cursor is never followed').toEqual([true, ['s']]);
    },
  },
  {
    group: 'Dedupe and guards',
    title: 'an error part-way can be resumed from .cursor',
    async run({ paginate }, { expect }) {
      const map: Record<string, Page<Item> | Error> = {
        null: { items: it(1, 2), endCursor: 'a', hasNextPage: true },
        a: { items: it(3), endCursor: 'b', hasNextPage: true },
        b: new Error('503'),
      };
      const b = book(map);
      const p = paginate(b.fetchPage);
      const got: number[] = [];
      let error = '';
      try {
        for await (const x of p) got.push(x.id);
      } catch (e) {
        error = (e as Error).message;
      }
      expect([got, error, p.cursor]).toEqual([[1, 2, 3], '503', 'b']);
      map.b = { items: it(4), endCursor: null, hasNextPage: false };
      expect(ids(await collect(paginate(b.fetchPage, { startCursor: p.cursor })))).toEqual([4]);
    },
  },
  {
    group: 'Bidirectional feed',
    title: 'loadOlder pages forward until hasNextPage is false',
    async run({ createFeed }, { expect }) {
      const s = relay([10, 9, 8, 7, 6]);
      const feed = createFeed({ fetchPage: s.fetchPage, pageSize: 2 });
      expect([feed.items, feed.hasOlder, feed.hasNewer]).toEqual([[], true, false]);
      await feed.loadOlder();
      await feed.loadOlder();
      expect(ids(feed.items)).toEqual([10, 9, 8, 7]);
      s.data.splice(1, 1);
      s.data.splice(3, 0, { id: 9 });
      await feed.loadOlder();
      expect([ids(feed.items), feed.hasOlder], '9 moved down the list: it is not shown twice').toEqual([[10, 9, 8, 7, 6], false]);
      await feed.loadOlder();
      expect(s.calls, 'no fetch once there is nothing older').toEqual([
        { first: 2, after: null },
        { first: 2, after: 'c9' },
        { first: 2, after: 'c7' },
      ]);
    },
  },
  {
    group: 'Bidirectional feed',
    title: 'loadNewer prepends with last/before and dedupes',
    async run({ createFeed }, { expect }) {
      const s = relay([5, 4, 3]);
      const feed = createFeed({ fetchPage: s.fetchPage, pageSize: 2 });
      await feed.loadNewer();
      expect(s.calls, 'nothing to anchor on yet').toEqual([]);
      await feed.loadOlder();
      s.data.unshift({ id: 8 }, { id: 7 }, { id: 6 });
      await feed.loadNewer();
      expect([ids(feed.items), feed.hasNewer]).toEqual([[7, 6, 5, 4], true]);
      expect(s.calls[1]).toEqual({ last: 2, before: 'c5' });
      s.data.splice(1, 0, { id: 5 });
      await feed.loadNewer();
      expect([ids(feed.items), feed.hasNewer], 'a node already in the list is not added twice').toEqual([[8, 7, 6, 5, 4], false]);
    },
  },
  {
    group: 'Bidirectional feed',
    title: 'maxItems evicts from the far end',
    async run({ createFeed }, { expect }) {
      const s = relay([10, 9, 8, 7, 6, 5, 4]);
      const feed = createFeed({ fetchPage: s.fetchPage, pageSize: 2, maxItems: 4 });
      await feed.loadOlder();
      await feed.loadOlder();
      expect([ids(feed.items), feed.hasNewer]).toEqual([[10, 9, 8, 7], false]);
      await feed.loadOlder();
      expect([ids(feed.items), feed.hasNewer, feed.hasOlder], 'scrolling down drops the newest').toEqual([[8, 7, 6, 5], true, true]);
      await feed.loadNewer();
      expect([ids(feed.items), feed.hasNewer, feed.hasOlder], 'scrolling up drops the oldest').toEqual([[10, 9, 8, 7], false, true]);
      await feed.loadOlder();
      expect(s.calls[s.calls.length - 1]).toEqual({ first: 2, after: 'c7' });
    },
  },
  {
    group: 'Bidirectional feed',
    title: 'concurrent loads share one request; a failed load changes nothing',
    async run({ createFeed }, { expect }) {
      const s = relay([4, 3, 2, 1]);
      const feed = createFeed({ fetchPage: s.fetchPage, pageSize: 2 });
      const a = feed.loadOlder();
      const b = feed.loadOlder();
      expect(a === b, 'same promise').toBe(true);
      await Promise.all([a, b]);
      expect([ids(feed.items), s.calls.length]).toEqual([[4, 3], 1]);
      s.setFail(true);
      let error = '';
      await feed.loadOlder().catch((e: Error) => { error = e.message; });
      expect([error, ids(feed.items), feed.hasOlder]).toEqual(['offline', [4, 3], true]);
      s.setFail(false);
      await feed.loadOlder();
      expect(ids(feed.items), 'retry works').toEqual([4, 3, 2, 1]);
    },
  },
  {
    group: 'Live updates',
    title: 'insert, update and delete events',
    async run({ createFeed }, { expect }) {
      const s = relay([5, 4, 3]);
      const feed = createFeed({ fetchPage: s.fetchPage, pageSize: 3, maxItems: 3 });
      await feed.loadOlder();
      expect(feed.hasOlder).toBe(false);
      feed.apply({ type: 'insert', edge: { cursor: 'c6', node: { id: 6 } } });
      expect([ids(feed.items), feed.hasOlder], '3 was pushed out, so there is something older again').toEqual([[6, 5, 4], true]);
      feed.apply({ type: 'insert', edge: { cursor: 'c6', node: { id: 6 } } });
      feed.apply({ type: 'update', node: { id: 5, v: 'v2' } });
      feed.apply({ type: 'update', node: { id: 4 } });
      feed.apply({ type: 'update', node: { id: 99, v: 'v2' } });
      expect(feed.items, 'an update replaces the node').toEqual([{ id: 6 }, { id: 5, v: 'v2' }, { id: 4 }]);
      feed.apply({ type: 'insert', edge: { cursor: 'c7', node: { id: 7 } } });
      expect(ids(feed.items), 'over maxItems: the oldest goes').toEqual([7, 6, 5]);
      feed.apply({ type: 'delete', id: 6 });
      feed.apply({ type: 'delete', id: 42 });
      expect(ids(feed.items)).toEqual([7, 5]);
      await feed.loadOlder();
      expect(s.calls[1], 'continues after the new last item').toEqual({ first: 3, after: 'c5' });
      expect(ids(feed.items)).toEqual([5, 4, 3]);
      expect(feed.hasNewer).toBe(true);
      feed.apply({ type: 'insert', edge: { cursor: 'c8', node: { id: 8 } } });
      expect(ids(feed.items), 'not at the top: an insert would leave a gap, so it is ignored').toEqual([5, 4, 3]);
    },
  },
];
