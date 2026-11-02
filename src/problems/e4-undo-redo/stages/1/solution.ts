import type { History } from './types';

export function createHistory<S>(initial: S): History<S> {
  let present = initial;
  const past: S[] = [];
  let future: S[] = [];

  return {
    get state() { return present; },
    push(state) {
      past.push(present);
      present = state;
      future = [];
    },
    undo() {
      if (past.length === 0) return false;
      future.push(present);
      present = past.pop()!;
      return true;
    },
    redo() {
      if (future.length === 0) return false;
      past.push(present);
      present = future.pop()!;
      return true;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
