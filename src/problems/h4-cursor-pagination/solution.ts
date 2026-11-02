import type { Id, Page, PaginateOptions, Paginator, Edge, FeedEvent, FeedOptions, Feed } from './types';

const defaultId = (item: unknown): Id => (item as { id: Id }).id;

export function paginate<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>, options: PaginateOptions<T> = {}): Paginator<T> {
  const getId = options.getId ?? defaultId;
  let cursor = options.startCursor ?? null;
  async function* run(): AsyncGenerator<T, void, undefined> {
    const seenIds = new Set<Id>();
    const usedCursors = new Set<string | null>([cursor]);
    while (true) {
      const page = await fetchPage(cursor);
      if (page.hasNextPage) {
        if (page.endCursor === null) throw new Error('hasNextPage is true but endCursor is null');
        if (usedCursors.has(page.endCursor)) throw new Error(`Cursor repeated: ${page.endCursor}`);
        usedCursors.add(page.endCursor);
      }
      for (const item of page.items) {
        const id = getId(item);
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        yield item;
      }
      cursor = page.endCursor;
      if (!page.hasNextPage) return;
    }
  }
  const gen = run();
  Object.defineProperty(gen, 'cursor', { get: () => cursor });
  return gen as Paginator<T>;
}

export function createFeed<T>(options: FeedOptions<T>): Feed<T> {
  const getId = options.getId ?? defaultId;
  const maxItems = options.maxItems ?? Infinity;
  let edges: Edge<T>[] = [];
  let hasOlder = true;
  let hasNewer = false;
  let olderInFlight: Promise<void> | null = null;
  let newerInFlight: Promise<void> | null = null;

  const has = (id: Id) => edges.some((e) => getId(e.node) === id);
  const fresh = (incoming: Edge<T>[]) => {
    const ids = new Set(edges.map((e) => getId(e.node)));
    return incoming.filter((e) => {
      const id = getId(e.node);
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    });
  };
  const trimOldest = () => {
    if (edges.length > maxItems) {
      edges = edges.slice(0, maxItems);
      hasOlder = true;
    }
  };

  const loadOlder = (): Promise<void> => {
    if (olderInFlight) return olderInFlight;
    if (!hasOlder) return Promise.resolve();
    const after = edges.length ? edges[edges.length - 1].cursor : null;
    olderInFlight = (async () => {
      try {
        const conn = await options.fetchPage({ first: options.pageSize, after });
        edges = [...edges, ...fresh(conn.edges)];
        hasOlder = conn.pageInfo.hasNextPage;
        if (edges.length > maxItems) {
          edges = edges.slice(edges.length - maxItems);
          hasNewer = true;
        }
      } finally {
        olderInFlight = null;
      }
    })();
    return olderInFlight;
  };

  const loadNewer = (): Promise<void> => {
    if (newerInFlight) return newerInFlight;
    if (!edges.length) return Promise.resolve();
    const before = edges[0].cursor;
    newerInFlight = (async () => {
      try {
        const conn = await options.fetchPage({ last: options.pageSize, before });
        edges = [...fresh(conn.edges), ...edges];
        hasNewer = conn.pageInfo.hasPreviousPage;
        trimOldest();
      } finally {
        newerInFlight = null;
      }
    })();
    return newerInFlight;
  };

  const apply = (event: FeedEvent<T>) => {
    if (event.type === 'insert') {
      const id = getId(event.edge.node);
      if (hasNewer || has(id)) return;
      edges = [event.edge, ...edges];
      trimOldest();
    } else if (event.type === 'update') {
      const id = getId(event.node);
      edges = edges.map((e) => (getId(e.node) === id ? { cursor: e.cursor, node: event.node } : e));
    } else {
      edges = edges.filter((e) => getId(e.node) !== event.id);
    }
  };

  return {
    get items() { return edges.map((e) => e.node); },
    get hasOlder() { return hasOlder; },
    get hasNewer() { return hasNewer; },
    loadOlder,
    loadNewer,
    apply,
  };
}
