import type { Action, Reducer, Listener, Dispatch, Store, StoreCreator, Enhancer, MiddlewareAPI, Middleware } from './types';

export const ActionTypes = { INIT: '@@redux/INIT', REPLACE: '@@redux/REPLACE' } as const;

export function createStore<S>(reducer: Reducer<S>, preloadedState?: S | Enhancer, enhancer?: Enhancer): Store<S> {
  throw new Error('Not implemented');
}

export function combineReducers(reducers: Record<string, Reducer>): Reducer<Record<string, any>> {
  throw new Error('Not implemented');
}

export function compose(...fns: Function[]): Function {
  throw new Error('Not implemented');
}

export function applyMiddleware(...middlewares: Middleware[]): Enhancer {
  throw new Error('Not implemented');
}
