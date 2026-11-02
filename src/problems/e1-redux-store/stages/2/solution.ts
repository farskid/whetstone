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

export function combineReducers(reducers: Record<string, Reducer>): Reducer<Record<string, any>> {
  const keys = Object.keys(reducers).filter((k) => typeof reducers[k] === 'function');
  return (state = {}, action) => {
    let changed = false;
    const next: Record<string, any> = {};
    for (const key of keys) {
      const prev = state[key];
      const value = reducers[key](prev, action);
      if (value === undefined) throw new Error(`Reducer "${key}" returned undefined for action "${action.type}"`);
      next[key] = value;
      changed ||= value !== prev;
    }
    changed ||= keys.length !== Object.keys(state).length;
    return changed ? next : state;
  };
}
