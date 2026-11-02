import type { SetState, Listener, StoreApi, Initializer } from './types';

export function create<T>(initializer: Initializer<T>): StoreApi<T> {
  let state: T;
  const listeners = new Set<Listener<T>>();
  const setState: SetState<T> = (partial, replace) => {
    const next = typeof partial === 'function' ? (partial as (s: T) => Partial<T>)(state) : partial;
    if (Object.is(next, state)) return;
    const prev = state;
    state = replace || typeof next !== 'object' || next === null ? (next as T) : Object.assign({}, state, next);
    for (const l of [...listeners]) l(state, prev);
  };
  const api: StoreApi<T> = {
    getState: () => state,
    setState,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  state = initializer(setState, () => state, api);
  return api;
}
