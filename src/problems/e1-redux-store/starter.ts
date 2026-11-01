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
