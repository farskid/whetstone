/** Merges `partial` (or `partial(state)`) into a new state object; with `replace`, swaps the whole state. */
export type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;

/** Returns the current state. */
export type GetState<T> = () => T;

/** Called after every change with the new and previous state. */
export type Listener<T> = (state: T, prev: T) => void;

/** The store returned by `create`. */
export interface StoreApi<T> {
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe(listener: Listener<T>): () => void;
}

/** Builds the initial state. `set` and `get` act on the store being created. */
export type Initializer<T> = (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) => T;
