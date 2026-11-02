import type { Page, PaginateOptions, Paginator } from './types';

export function paginate<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>, options: PaginateOptions<T> = {}): Paginator<T> {
  throw new Error('Not implemented');
}
