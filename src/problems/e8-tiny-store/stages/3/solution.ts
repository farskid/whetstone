import type { SetState, Listener, SubscribeOptions, StoreApi, Initializer, PersistOptions } from './types';

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
          if (eq(current, next)) return;
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
    let waiters: (() => void)[] = [];

    const serialize = () => JSON.stringify({ state: partialize(get()), version });
    const write = () => {
      const value = serialize();
      try {
        const r = options.storage.setItem(options.name, value);
        if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
      } catch {
        // storage full or unavailable: keep the in-memory state
      }
    };

    const persistingSet: SetState<T> = (partial, replace) => {
      const prev = get();
      set(partial, replace);
      if (hydrated && get() !== prev) write();
    };
    api.setState = persistingSet;

    async function hydrate(): Promise<void> {
      hydrated = false;
      let error: unknown;
      try {
        const raw = await options.storage.getItem(options.name);
        if (raw !== null && raw !== undefined) {
          const parsed = JSON.parse(raw);
          if (typeof parsed !== 'object' || parsed === null || !('state' in parsed)) throw new Error('Invalid persisted state');
          let persisted = parsed.state;
          const storedVersion = typeof parsed.version === 'number' ? parsed.version : 0;
          if (storedVersion !== version) persisted = options.migrate ? await options.migrate(persisted, storedVersion) : undefined;
          if (persisted !== undefined) set(merge(persisted, get()), true);
        }
      } catch (e) {
        error = e;
      }
      hydrated = true;
      options.onHydrated?.(get(), error);
      const ws = waiters;
      waiters = [];
      for (const w of ws) w();
    }

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
