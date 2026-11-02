/** Snapshot undo/redo history. `state` is the present state. */
export interface History<S> {
  readonly state: S;
  push(state: S): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}
