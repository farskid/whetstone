// Bug: Error results stay in the cache
export type BatchFn<K, V> = (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;

export interface LoaderOptions<K, C> {
  /** Cache results per key (default true). With false, every load() goes into a batch. */
  cache?: boolean;
  /** Most keys per batchFn call (default Infinity). */
  maxBatchSize?: number;
  /** Decides when a batch runs. Default: queueMicrotask, so every load() in the same synchronous run shares a batch. */
  batchScheduleFn?: (dispatch: () => void) => void;
  /** Maps a key to its cache key (default: the key itself). */
  cacheKeyFn?: (key: K) => C;
}

interface Batch<K, V, C> {
  keys: K[];
  cacheKeys: C[];
  promises: Promise<V>[];
  callbacks: { resolve: (v: V) => void; reject: (e: unknown) => void }[];
  dispatched: boolean;
}

export class Loader<K, V, C = K> {
  private readonly cacheMap = new Map<C, Promise<V>>();
  private batch: Batch<K, V, C> | null = null;
  private readonly maxBatchSize: number;

  constructor(private readonly batchFn: BatchFn<K, V>, private readonly options: LoaderOptions<K, C> = {}) {
    const max = options.maxBatchSize ?? Infinity;
    if (!(max === Infinity || (Number.isInteger(max) && max > 0))) throw new RangeError(`maxBatchSize must be a positive integer, got ${max}`);
    this.maxBatchSize = max;
  }

  load(key: K): Promise<V> {
    if (key === null || key === undefined) throw new TypeError(`load() needs a key, got ${String(key)}`);
    const useCache = this.options.cache !== false;
    const ck = this.cacheKey(key);
    if (useCache) {
      const hit = this.cacheMap.get(ck);
      if (hit) return hit;
    }
    const batch = this.currentBatch();
    let callbacks!: Batch<K, V, C>['callbacks'][number];
    const promise = new Promise<V>((resolve, reject) => { callbacks = { resolve, reject }; });
    batch.keys.push(key);
    batch.cacheKeys.push(ck);
    batch.promises.push(promise);
    batch.callbacks.push(callbacks);
    if (useCache) this.cacheMap.set(ck, promise);
    return promise;
  }

  loadMany(keys: readonly K[]): Promise<(V | Error)[]> {
    return Promise.all(keys.map((k) => this.load(k).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))))));
  }

  clear(key: K): this {
    this.cacheMap.delete(this.cacheKey(key));
    return this;
  }

  clearAll(): this {
    this.cacheMap.clear();
    return this;
  }

  prime(key: K, value: V): this {
    if (this.options.cache === false) return this;
    const ck = this.cacheKey(key);
    if (!this.cacheMap.has(ck)) this.cacheMap.set(ck, Promise.resolve(value));
    return this;
  }

  private cacheKey(key: K): C {
    return this.options.cacheKeyFn ? this.options.cacheKeyFn(key) : (key as unknown as C);
  }

  private currentBatch(): Batch<K, V, C> {
    const b = this.batch;
    if (b && !b.dispatched && b.keys.length < this.maxBatchSize) return b;
    const next: Batch<K, V, C> = { keys: [], cacheKeys: [], promises: [], callbacks: [], dispatched: false };
    this.batch = next;
    const schedule = this.options.batchScheduleFn ?? ((cb: () => void) => queueMicrotask(cb));
    schedule(() => this.dispatch(next));
    return next;
  }

  /** Drop entry i of a batch from the cache, unless the cache already holds something newer for that key. */
  private forget(b: Batch<K, V, C>, i: number): void {
    if (this.cacheMap.get(b.cacheKeys[i]) === b.promises[i]) this.cacheMap.delete(b.cacheKeys[i]);
  }

  private dispatch(b: Batch<K, V, C>): void {
    if (b.dispatched) return;
    b.dispatched = true;
    if (this.batch === b) this.batch = null;
    if (b.keys.length === 0) return;
    const fail = (err: unknown) => {
      b.callbacks.forEach((cb, i) => { this.forget(b, i); cb.reject(err); });
    };
    let result: PromiseLike<ArrayLike<V | Error>>;
    try {
      result = this.batchFn(b.keys);
    } catch (e) {
      fail(e);
      return;
    }
    if (!result || typeof result.then !== 'function') {
      fail(new TypeError('batchFn must return a Promise'));
      return;
    }
    Promise.resolve(result).then((values) => {
      if (!values || values.length !== b.keys.length) {
        fail(new TypeError(`batchFn returned ${values ? values.length : values} values for ${b.keys.length} keys`));
        return;
      }
      b.callbacks.forEach((cb, i) => {
        const v = values[i];
        if (v instanceof Error) {
          cb.reject(v);
        } else cb.resolve(v);
      });
    }, fail);
  }
}
