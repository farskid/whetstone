import type { Page, PaginateOptions, Paginator } from './types';

export function paginate<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>, options: PaginateOptions<T> = {}): Paginator<T> {
  let cursor = options.startCursor ?? null;
  async function* run(): AsyncGenerator<T, void, undefined> {
    while (true) {
      const page = await fetchPage(cursor);
      for (const item of page.items) yield item;
      cursor = page.endCursor;
      if (!page.hasNextPage) return;
    }
  }
  const gen = run();
  Object.defineProperty(gen, 'cursor', { get: () => cursor });
  return gen as Paginator<T>;
}
