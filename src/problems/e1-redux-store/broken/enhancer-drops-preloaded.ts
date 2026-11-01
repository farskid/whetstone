// Bug: preloaded state is lost when an enhancer is used
export interface Action { type: string; [extra: string]: unknown }
export type Reducer<S = any, A = any> = (state: S | undefined, action: A) => S;
export type Listener = () => void;
export type Dispatch = (action: any) => any;

export interface Store<S = any> {
  getState(): S;
  dispatch: Dispatch;
  subscribe(listener: Listener): () => void;
  replaceReducer(next: Reducer<S>): void;
}

export type StoreCreator = <S>(reducer: Reducer<S>, preloadedState?: S) => Store<S>;
export type Enhancer = (next: StoreCreator) => StoreCreator;
export interface MiddlewareAPI { getState(): any; dispatch: Dispatch }
export type Middleware = (api: MiddlewareAPI) => (next: Dispatch) => Dispatch;

export const ActionTypes = { INIT: '@@redux/INIT', REPLACE: '@@redux/REPLACE' } as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function createStore<S>(reducer: Reducer<S>, preloadedState?: S | Enhancer, enhancer?: Enhancer): Store<S> {
  if (typeof preloadedState === 'function' && enhancer === undefined) {
    enhancer = preloadedState as Enhancer;
    preloadedState = undefined;
  }
  if (enhancer !== undefined) {
    if (typeof enhancer !== 'function') throw new Error('Expected the enhancer to be a function');
    return enhancer(createStore as StoreCreator)(reducer);
  }
  if (typeof reducer !== 'function') throw new Error('Expected the reducer to be a function');

  let currentReducer = reducer;
  let state = preloadedState as S;
  let currentListeners: Listener[] = [];
  let nextListeners = currentListeners;
  let reducing = false;

  const ensureCanMutate = () => {
    if (nextListeners === currentListeners) nextListeners = currentListeners.slice();
  };

  function getState(): S {
    if (reducing) throw new Error('You may not call getState() while the reducer is executing');
    return state;
  }

  function subscribe(listener: Listener): () => void {
    if (typeof listener !== 'function') throw new Error('Expected the listener to be a function');
    if (reducing) throw new Error('You may not call subscribe() while the reducer is executing');
    let subscribed = true;
    ensureCanMutate();
    nextListeners.push(listener);
    return () => {
      if (!subscribed) return;
      if (reducing) throw new Error('You may not unsubscribe while the reducer is executing');
      subscribed = false;
      ensureCanMutate();
      nextListeners.splice(nextListeners.indexOf(listener), 1);
    };
  }

  function dispatch(action: any): any {
    if (!isPlainObject(action)) throw new Error('Actions must be plain objects');
    if (typeof action.type !== 'string') throw new Error('Actions must have a string type');
    if (reducing) throw new Error('Reducers may not dispatch actions');
    try {
      reducing = true;
      state = currentReducer(state, action);
    } finally {
      reducing = false;
    }
    const listeners = (currentListeners = nextListeners);
    for (const l of listeners) l();
    return action;
  }

  function replaceReducer(next: Reducer<S>): void {
    if (typeof next !== 'function') throw new Error('Expected the reducer to be a function');
    currentReducer = next;
    dispatch({ type: ActionTypes.REPLACE });
  }

  dispatch({ type: ActionTypes.INIT });
  return { getState, dispatch, subscribe, replaceReducer };
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

export function compose(...fns: Function[]): Function {
  if (fns.length === 0) return <T>(x: T) => x;
  return fns.reduce((a, b) => (...args: unknown[]) => a(b(...args)));
}

export function applyMiddleware(...middlewares: Middleware[]): Enhancer {
  return (next) => (reducer, preloaded) => {
    const store = next(reducer, preloaded);
    let dispatch: Dispatch = () => {
      throw new Error('Dispatching while constructing your middleware is not allowed');
    };
    const api: MiddlewareAPI = { getState: store.getState, dispatch: (action) => dispatch(action) };
    const chain = middlewares.map((m) => m(api));
    dispatch = (compose(...chain) as (d: Dispatch) => Dispatch)(store.dispatch);
    return { ...store, dispatch };
  };
}
