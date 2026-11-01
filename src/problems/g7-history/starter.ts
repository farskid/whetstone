export type Action = 'POP' | 'PUSH' | 'REPLACE';

export interface Path {
  pathname: string;
  search: string;
  hash: string;
}

export interface Location extends Path {
  state: unknown;
  key: string;
}

export type To = string | Partial<Path>;

export interface Update {
  action: Action;
  location: Location;
}

export interface Transition extends Update {
  /** Approve on behalf of the blocker that stopped this navigation and try again. */
  retry(): void;
}

/** Return true to let the navigation through; anything else blocks it. */
export type Blocker = (tx: Transition) => boolean | void;

export interface MemoryHistoryOptions {
  initialEntries?: (To | (Partial<Path> & { state?: unknown }))[];
  initialIndex?: number;
  maxLength?: number;
}

export interface MemoryHistory {
  readonly location: Location;
  readonly action: Action;
  readonly index: number;
  readonly length: number;
  push(to: To, state?: unknown): void;
  replace(to: To, state?: unknown): void;
  go(delta: number): void;
  back(): void;
  forward(): void;
  listen(listener: (update: Update) => void): () => void;
  block(blocker: Blocker): () => void;
  createHref(to: To): string;
  saveScroll(y: number): void;
  getScroll(key?: string): number | undefined;
}

export function parsePath(path: string): Partial<Path> {
  throw new Error('Not implemented');
}

export function createMemoryHistory(options: MemoryHistoryOptions = {}): MemoryHistory {
  throw new Error('Not implemented');
}
