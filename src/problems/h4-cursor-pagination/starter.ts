export type Id = string | number;

export interface Page<T> {
  items: T[];
  endCursor: string | null;
  hasNextPage: boolean;
}

export interface PaginateOptions<T> {
  startCursor?: string | null;
  /** Default: item.id */
  getId?: (item: T) => Id;
}

export interface Paginator<T> extends AsyncGenerator<T, void, undefined> {
  /** The cursor to pass as startCursor to carry on from where this paginator stopped. */
  readonly cursor: string | null;
}

export function paginate<T>(fetchPage: (cursor: string | null) => Promise<Page<T>>, options: PaginateOptions<T> = {}): Paginator<T> {
  throw new Error('Not implemented');
}

export interface Edge<T> {
  cursor: string;
  node: T;
}

export interface Connection<T> {
  /** Always in feed order: newest first. */
  edges: Edge<T>[];
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
}

export type FeedArgs = { first: number; after: string | null } | { last: number; before: string };

export type FeedEvent<T> =
  | { type: 'insert'; edge: Edge<T> }
  | { type: 'update'; node: T }
  | { type: 'delete'; id: Id };

export interface FeedOptions<T> {
  fetchPage: (args: FeedArgs) => Promise<Connection<T>>;
  pageSize: number;
  /** Default Infinity. */
  maxItems?: number;
  getId?: (node: T) => Id;
}

export interface Feed<T> {
  readonly items: T[];
  readonly hasOlder: boolean;
  readonly hasNewer: boolean;
  loadOlder(): Promise<void>;
  loadNewer(): Promise<void>;
  apply(event: FeedEvent<T>): void;
}

export function createFeed<T>(options: FeedOptions<T>): Feed<T> {
  throw new Error('Not implemented');
}
