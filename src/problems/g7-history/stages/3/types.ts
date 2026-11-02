/** How the current entry was reached. */
export type Action = 'POP' | 'PUSH' | 'REPLACE';

export interface Path {
  pathname: string;
  search: string;
  hash: string;
}

/** One history entry. `key` is unique per entry; `state` defaults to null. */
export interface Location extends Path {
  state: unknown;
  key: string;
}

/** A navigation target, resolved against the current location. */
export type To = string | Partial<Path>;

/** What listeners receive after a navigation. */
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
  /** Defaults to the last entry; clamped into range. */
  initialIndex?: number;
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
}
