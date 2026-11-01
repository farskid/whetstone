// Bug: the max-listener warning fires on every add past the limit
export type EventMap = Record<string, unknown[]>;
type AnyMap = Record<string, any[]>;
type Listener<A extends unknown[]> = (...args: A) => void;
type Wildcard<E extends EventMap> = (name: keyof E & string, ...args: any[]) => void;
interface Entry { fn: (...args: any[]) => void; once: boolean }

export class Emitter<E extends EventMap = AnyMap> {
  private events = new Map<string, Entry[]>();
  private max = 10;
  private warned = new Set<string>();
  private onWarning: (message: string) => void;

  constructor(options: { onWarning?: (message: string) => void } = {}) {
    this.onWarning = options.onWarning ?? ((m) => console.warn(m));
  }

  on<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this;
  on(name: '*', fn: Wildcard<E>): this;
  on(name: string, fn: (...args: any[]) => void): this {
    return this.add(name, fn, false, false);
  }

  once<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    return this.add(name, fn, true, false);
  }

  prependListener<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    return this.add(name, fn, false, true);
  }

  off<K extends keyof E & string>(name: K | '*', fn: (...args: any[]) => void): this {
    const list = this.events.get(name);
    if (!list) return this;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].fn === fn) {
        const next = list.slice();
        next.splice(i, 1);
        if (next.length) this.events.set(name, next); else this.events.delete(name);
        break;
      }
    }
    return this;
  }

  emit<K extends keyof E & string>(name: K, ...args: E[K]): boolean {
    const list = this.events.get(name);
    const wild = name === '*' ? undefined : this.events.get('*');
    if (name === 'error' && !list?.length) {
      const err = args[0];
      throw err instanceof Error ? err : new Error(`Unhandled error. (${String(err)})`);
    }
    if (!list?.length && !wild?.length) return false;
    if (list) for (const e of list) {
      if (e.once) this.removeEntry(name, e);
      e.fn(...args);
    }
    if (wild) for (const e of wild) {
      if (e.once) this.removeEntry('*', e);
      e.fn(name, ...args);
    }
    return true;
  }

  listenerCount(name: (keyof E & string) | '*'): number {
    return this.events.get(name)?.length ?? 0;
  }

  setMaxListeners(n: number): this {
    this.max = n;
    return this;
  }

  private removeEntry(name: string, entry: Entry) {
    const list = this.events.get(name);
    if (!list || !list.includes(entry)) return;
    const next = list.filter((e) => e !== entry);
    if (next.length) this.events.set(name, next); else this.events.delete(name);
  }

  private add(name: string, fn: (...args: any[]) => void, once: boolean, prepend: boolean): this {
    const list = (this.events.get(name) ?? []).slice();
    const entry = { fn, once };
    if (prepend) list.unshift(entry); else list.push(entry);
    this.events.set(name, list);
    if (this.max > 0 && list.length > this.max ) {
      this.warned.add(name);
      this.onWarning(`Possible memory leak: ${list.length} "${name}" listeners added (max ${this.max}).`);
    }
    return this;
  }
}

export function once<E extends EventMap, K extends keyof E & string>(
  emitter: Emitter<E>,
  name: K,
  options: { signal?: AbortSignal } = {},
): Promise<E[K]> {
  const { signal } = options;
  const abortError = () => Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise<E[K]>((resolve, reject) => {
    const em = emitter as unknown as Emitter<AnyMap>;
    const cleanup = () => {
      em.off(name, onEvent);
      if (name !== 'error') em.off('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };
    const onEvent = (...args: any[]) => { cleanup(); resolve(args as E[K]); };
    const onError = (err: unknown) => { cleanup(); reject(err); };
    const onAbort = () => { cleanup(); reject(abortError()); };
    em.on(name, onEvent);
    if (name !== 'error') em.on('error', onError);
    signal?.addEventListener('abort', onAbort);
  });
}
