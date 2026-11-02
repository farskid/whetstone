import type { Reducer, Listener, Store } from './types';

export const ActionTypes = { INIT: '@@redux/INIT', REPLACE: '@@redux/REPLACE' } as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function createStore<S>(reducer: Reducer<S>, preloadedState?: S): Store<S> {
  let state = preloadedState as S;
  const listeners = new Set<Listener>();

  function dispatch(action: any): any {
    if (!isPlainObject(action)) throw new Error('Actions must be plain objects');
    if (typeof action.type !== 'string') throw new Error('Actions must have a string type');
    state = reducer(state, action);
    for (const l of listeners) l();
    return action;
  }

  dispatch({ type: ActionTypes.INIT });
  return {
    getState: () => state,
    dispatch,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
