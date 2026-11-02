import type { HistoryOptions, History } from './types';

interface Entry<S> { state: S }

export function createHistory<S>(initial: S, options: HistoryOptions = {}): History<S> {
  const capacity = options.capacity ?? Infinity;
  const coalesceMs = options.coalesceMs ?? 500;
  const clock = options.clock ?? { now: () => Date.now() };

  let present: Entry<S> = { state: initial };
  const past: Entry<S>[] = [];
  let future: Entry<S>[] = [];
  let lastGroup: { key: string; at: number } | null = null;
  const txStack: Entry<S>[] = []; // present at each begin()

  const trim = () => { while (past.length > capacity) past.shift(); };

  return {
    get state() { return present.state; },
    push(state, opts = {}) {
      const next: Entry<S> = { state };
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
