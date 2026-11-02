export interface Action { type: string; [extra: string]: unknown }

export type Reducer<S = any, A = any> = (state: S | undefined, action: A) => S;

export type Listener = () => void;

export type Dispatch = (action: any) => any;

export interface Store<S = any> {
  getState(): S;
  dispatch: Dispatch;
  subscribe(listener: Listener): () => void;
}

export type StoreCreator = <S>(reducer: Reducer<S>, preloadedState?: S) => Store<S>;

export type Enhancer = (next: StoreCreator) => StoreCreator;

export interface MiddlewareAPI { getState(): any; dispatch: Dispatch }

export type Middleware = (api: MiddlewareAPI) => (next: Dispatch) => Dispatch;
