import type { Id, Page, PaginateOptions, Paginator } from './types';

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
