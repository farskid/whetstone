export type Id = string | number;

/** One page from fetchPage(cursor). */
export interface Page<T> {
  items: T[];
  endCursor: string | null;
  hasNextPage: boolean;
}

export interface PaginateOptions<T> {
  /** Cursor for the first fetchPage call (default null). */
  startCursor?: string | null;
  /** Default: item.id */
  getId?: (item: T) => Id;
}

export interface Paginator<T> extends AsyncGenerator<T, void, undefined> {
  /** The cursor to pass as startCursor to carry on from where this paginator stopped. */
  readonly cursor: string | null;
}
