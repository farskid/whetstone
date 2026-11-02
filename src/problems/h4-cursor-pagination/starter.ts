import type { Page, PaginateOptions, Paginator, FeedOptions, Feed } from './types';

export function paginate<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>, options: PaginateOptions<T> = {}): Paginator<T> {
  throw new Error('Not implemented');
}

export function createFeed<T>(options: FeedOptions<T>): Feed<T> {
  throw new Error('Not implemented');
}
