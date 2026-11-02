/** A time source: `now()` in milliseconds. Defaults to `Date.now`. */
export interface Clock { now(): number }

/** `capacity` caps the undo steps kept (default unlimited); pushes with one groupKey within `coalesceMs` (500) merge. */
export interface HistoryOptions { capacity?: number; coalesceMs?: number; clock?: Clock }

/** `groupKey` lets rapid pushes coalesce into one undo step. */
export interface PushOptions { groupKey?: string }

/** Snapshot undo/redo history. `state` is the present state. */
export interface History<S> {
  readonly state: S;
  push(state: S, options?: PushOptions): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}
