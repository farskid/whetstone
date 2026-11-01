export type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
export type GetState<T> = () => T;
export type Listener<T> = (state: T, prev: T) => void;
export interface SubscribeOptions<U> { equalityFn?: (a: U, b: U) => boolean; fireImmediately?: boolean }

export interface StoreApi<T> {
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe(listener: Listener<T>): () => void;
  subscribe<U>(selector: (state: T) => U, listener: (slice: U, prev: U) => void, options?: SubscribeOptions<U>): () => void;
  persist?: PersistApi;
}
export type Initializer<T> = (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) => T;

export interface StorageLike {
  getItem(name: string): string | null | Promise<string | null>;
  setItem(name: string, value: string): void | Promise<void>;
  removeItem(name: string): void | Promise<void>;
}
export interface BusLike {
  postMessage(message: { name: string; value: string }): void;
  subscribe(handler: (message: { name: string; value: string }) => void): () => void;
}
export interface PersistOptions<T> {
  name: string;
  storage: StorageLike;
  version?: number;
  migrate?: (persisted: any, version: number) => any;
  partialize?: (state: T) => any;
  merge?: (persisted: any, current: T) => T;
  onHydrated?: (state: T, error?: unknown) => void;
  bus?: BusLike;
}
export interface PersistApi {
  hasHydrated(): boolean;
  rehydrate(): Promise<void>;
  whenHydrated(): Promise<void>;
  clearStorage(): Promise<void>;
}

export function create<T>(initializer: Initializer<T>): StoreApi<T> {
  throw new Error('Not implemented');
}

export function persist<T>(initializer: Initializer<T>, options: PersistOptions<T>): Initializer<T> {
  throw new Error('Not implemented');
}
