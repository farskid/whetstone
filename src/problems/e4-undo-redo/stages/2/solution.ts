import type { HistoryOptions, History } from './types';

export function createHistory<S>(initial: S, options: HistoryOptions = {}): History<S> {
  const capacity = options.capacity ?? Infinity;
  const coalesceMs = options.coalesceMs ?? 500;
  const clock = options.clock ?? { now: () => Date.now() };

  let present = initial;
  const past: S[] = [];
  let future: S[] = [];
  let lastGroup: { key: string; at: number } | null = null;

  const trim = () => { while (past.length > capacity) past.shift(); };

  return {
    get state() { return present; },
    push(state, opts = {}) {
      const now = clock.now();
      const key = opts.groupKey;
      const coalesce = key !== undefined && lastGroup !== null && lastGroup.key === key && now - lastGroup.at <= coalesceMs && past.length > 0;
      if (!coalesce) {
        past.push(present);
        trim();
      }
      present = state;
      future = [];
      lastGroup = key === undefined ? null : { key, at: now };
    },
    undo() {
      if (past.length === 0) return false;
      future.push(present);
      present = past.pop()!;
      lastGroup = null;
      return true;
    },
    redo() {
      if (future.length === 0) return false;
      past.push(present);
      present = future.pop()!;
      lastGroup = null;
      return true;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
