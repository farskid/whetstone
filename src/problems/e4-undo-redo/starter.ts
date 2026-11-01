export interface Clock { now(): number }
export interface HistoryOptions { capacity?: number; coalesceMs?: number; clock?: Clock }
export interface PushOptions<Sel> { groupKey?: string; selection?: Sel }

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

export interface Command { do(): void; undo(): void }
export interface CommandHistory {
  execute(command: Command): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}

export function createHistory<S, Sel = unknown>(initial: S, options: HistoryOptions = {}): History<S, Sel> {
  throw new Error('Not implemented');
}

export function createCommandHistory(options: { capacity?: number } = {}): CommandHistory {
  throw new Error('Not implemented');
}
