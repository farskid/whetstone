import type { SetState, Listener, SubscribeOptions, StoreApi, Initializer } from './types';

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
    subscribe(a: any, b?: any, options?: SubscribeOptions<any>) {
      let listener: Listener<T>;
      if (b === undefined) listener = a;
      else {
        const selector = a as (s: T) => unknown;
        const eq = options?.equalityFn ?? Object.is;
        let current = selector(state);
        listener = (s) => {
          const next = selector(s);
          if (eq(current, next)) return;
          const prev = current;
          current = next;
          b(next, prev);
        };
        if (options?.fireImmediately) b(current, current);
      }
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  state = initializer(setState, () => state, api);
  return api;
}
