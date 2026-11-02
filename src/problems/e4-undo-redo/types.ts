/** A time source: `now()` in milliseconds. Defaults to `Date.now`. */
export interface Clock { now(): number }

/** `capacity` caps the undo steps kept (default unlimited); pushes with one groupKey within `coalesceMs` (500) merge. */
export interface HistoryOptions { capacity?: number; coalesceMs?: number; clock?: Clock }

/** `groupKey` lets rapid pushes coalesce; `selection` defaults to the current selection. */
export interface PushOptions<Sel> { groupKey?: string; selection?: Sel }

/** Snapshot undo/redo history. `state` and `selection` are the present. */
export interface History<S, Sel = unknown> {
  readonly state: S;
  readonly selection: Sel | undefined;
  push(state: S, options?: PushOptions<Sel>): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  begin(): void;
  commit(): void;
  rollback(): void;
}

/** A reversible action for the command history. */
export interface Command { do(): void; undo(): void }

/** Undo/redo by running commands instead of keeping snapshots. */
export interface CommandHistory {
  execute(command: Command): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}
