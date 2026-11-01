// Bug: selector listeners fire on every change
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

export function persist<T>(initializer: Initializer<T>, options: PersistOptions<T>): Initializer<T> {
  return (set, get, api) => {
    const version = options.version ?? 0;
    const partialize = options.partialize ?? ((s: T) => s);
    const merge = options.merge ?? ((persisted: any, current: T) => ({ ...current, ...persisted }));
    let hydrated = false;
    let applyingRemote = false;
    let dirtyKeys = new Set<string>();
    let waiters: (() => void)[] = [];
    let hydrationRun = 0;

    const serialize = () => JSON.stringify({ state: partialize(get()), version });
    const write = () => {
      const value = serialize();
      try {
        const r = options.storage.setItem(options.name, value);
        if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
      } catch {
        // storage full or unavailable: keep the in-memory state
      }
      options.bus?.postMessage({ name: options.name, value });
    };

    const persistingSet: SetState<T> = (partial, replace) => {
      const prev = get() as any;
      set(partial, replace);
      const next = get() as any;
      if (applyingRemote) return;
      if (!hydrated) {
        if (typeof next === 'object' && next !== null) {
          for (const k of new Set([...Object.keys(prev ?? {}), ...Object.keys(next)])) if (!Object.is(prev?.[k], next[k])) dirtyKeys.add(k);
        }
        return;
      }
      if (next !== prev) write();
    };
    api.setState = persistingSet;

    async function hydrate(): Promise<void> {
      const run = ++hydrationRun;
      hydrated = false;
      let error: unknown;
      try {
        const raw = await options.storage.getItem(options.name);
        if (run !== hydrationRun) return;
        if (raw !== null && raw !== undefined) {
          const parsed = JSON.parse(raw);
          if (typeof parsed !== 'object' || parsed === null || !('state' in parsed)) throw new Error('Invalid persisted state');
          let persisted = parsed.state;
          const storedVersion = typeof parsed.version === 'number' ? parsed.version : 0;
          if (storedVersion !== version) persisted = options.migrate ? await options.migrate(persisted, storedVersion) : undefined;
          if (run !== hydrationRun) return;
          if (persisted !== undefined) {
            const filtered = typeof persisted === 'object' && persisted !== null
              ? Object.fromEntries(Object.entries(persisted).filter(([k]) => !dirtyKeys.has(k)))
              : persisted;
            set(merge(filtered, get()), true);
          }
        }
      } catch (e) {
        error = e;
      }
      if (run !== hydrationRun) return;
      hydrated = true;
      if (dirtyKeys.size > 0) write();
      dirtyKeys = new Set();
      options.onHydrated?.(get(), error);
      const ws = waiters;
      waiters = [];
      for (const w of ws) w();
    }

    options.bus?.subscribe((msg) => {
      if (msg.name !== options.name || !hydrated) return;
      try {
        const parsed = JSON.parse(msg.value);
        applyingRemote = true;
        set(merge(parsed.state, get()), true);
      } catch {
        // ignore malformed messages
      } finally {
        applyingRemote = false;
      }
    });

    api.persist = {
      hasHydrated: () => hydrated,
      rehydrate: () => hydrate(),
      whenHydrated: () => (hydrated ? Promise.resolve() : new Promise<void>((r) => waiters.push(r))),
      clearStorage: async () => { await options.storage.removeItem(options.name); },
    };

    const initial = initializer(persistingSet, get, api);
    Promise.resolve().then(hydrate);
    return initial;
  };
}
