// Bug: a throwing command is still recorded
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

interface Entry<S, Sel> { state: S; selection: Sel | undefined }

export function createHistory<S, Sel = unknown>(initial: S, options: HistoryOptions = {}): History<S, Sel> {
  const capacity = options.capacity ?? Infinity;
  const coalesceMs = options.coalesceMs ?? 500;
  const clock = options.clock ?? { now: () => Date.now() };

  let present: Entry<S, Sel> = { state: initial, selection: undefined };
  const past: Entry<S, Sel>[] = [];
  let future: Entry<S, Sel>[] = [];
  let lastGroup: { key: string; at: number } | null = null;
  const txStack: Entry<S, Sel>[] = []; // present at each begin()

  const trim = () => { while (past.length > capacity) past.shift(); };

  return {
    get state() { return present.state; },
    get selection() { return present.selection; },
    push(state, opts = {}) {
      const next: Entry<S, Sel> = { state, selection: opts.selection ?? present.selection };
      if (txStack.length > 0) { present = next; return; }
      const now = clock.now();
      const key = opts.groupKey;
      const coalesce = key !== undefined && lastGroup !== null && lastGroup.key === key && now - lastGroup.at <= coalesceMs && past.length > 0;
      if (!coalesce) {
        past.push(present);
        trim();
      }
      present = next;
      future = [];
      lastGroup = key === undefined ? null : { key, at: now };
    },
    undo() {
      if (txStack.length > 0) throw new Error('Cannot undo during a transaction');
      const prev = past.pop();
      if (!prev) return false;
      future.push(present);
      present = prev;
      lastGroup = null;
      return true;
    },
    redo() {
      if (txStack.length > 0) throw new Error('Cannot redo during a transaction');
      const next = future.pop();
      if (!next) return false;
      past.push(present);
      present = next;
      lastGroup = null;
      return true;
    },
    canUndo: () => txStack.length === 0 && past.length > 0,
    canRedo: () => txStack.length === 0 && future.length > 0,
    begin() { txStack.push(present); },
    commit() {
      const start = txStack.pop();
      if (!start) throw new Error('No transaction');
      lastGroup = null;
      if (txStack.length > 0 || start === present) return;
      past.push(start);
      trim();
      future = [];
    },
    rollback() {
      const start = txStack.pop();
      if (!start) throw new Error('No transaction');
      present = start;
      lastGroup = null;
    },
  };
}

export function createCommandHistory(options: { capacity?: number } = {}): CommandHistory {
  const capacity = options.capacity ?? Infinity;
  const done: Command[] = [];
  let undone: Command[] = [];
  return {
    execute(command) {
      done.push(command);
      command.do();
      if (done.length > capacity) done.shift();
      undone = [];
    },
    undo() {
      const c = done.pop();
      if (!c) return false;
      try {
        c.undo();
      } catch (e) {
        done.push(c);
        throw e;
      }
      undone.push(c);
      return true;
    },
    redo() {
      const c = undone.pop();
      if (!c) return false;
      try {
        c.do();
      } catch (e) {
        undone.push(c);
        throw e;
      }
      done.push(c);
      return true;
    },
    canUndo: () => done.length > 0,
    canRedo: () => undone.length > 0,
  };
}
