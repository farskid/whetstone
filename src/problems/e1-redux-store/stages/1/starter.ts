import type { Action, Reducer, Listener, Dispatch, Store } from './types';

export const ActionTypes = { INIT: '@@redux/INIT', REPLACE: '@@redux/REPLACE' } as const;

export function createStore<S>(reducer: Reducer<S>, preloadedState?: S): Store<S> {
  throw new Error('Not implemented');
}
