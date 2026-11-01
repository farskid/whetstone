export type BatchFn<K, V> = (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;

interface Batch<K, V> {
  keys: K[];
  promises: Promise<V>[];
  callbacks: { resolve: (v: V) => void; reject: (e: unknown) => void }[];
  dispatched: boolean;
}

export class Loader<K, V> {
  private readonly cacheMap = new Map<K, Promise<V>>();
  private batch: Batch<K, V> | null = null;
  constructor(private readonly batchFn: BatchFn<K, V>) {}

  load(key: K): Promise<V> {
    if (key === null || key === undefined) throw new TypeError(`load() needs a key, got ${String(key)}`);
    const hit = this.cacheMap.get(key);
    if (hit) return hit;
    const batch = this.currentBatch();
    let callbacks!: Batch<K, V>['callbacks'][number];
    const promise = new Promise<V>((resolve, reject) => { callbacks = { resolve, reject }; });
    batch.keys.push(key);
    batch.promises.push(promise);
    batch.callbacks.push(callbacks);
    this.cacheMap.set(key, promise);
    return promise;
  }

  private currentBatch(): Batch<K, V> {
    const b = this.batch;
    if (b && !b.dispatched) return b;
    const next: Batch<K, V> = { keys: [], promises: [], callbacks: [], dispatched: false };
    this.batch = next;
    queueMicrotask(() => this.dispatch(next));
    return next;
  }

  /** Drop entry i of a batch from the cache, unless the cache already holds something newer for that key. */
  private forget(b: Batch<K, V>, i: number): void {
    if (this.cacheMap.get(b.keys[i]) === b.promises[i]) this.cacheMap.delete(b.keys[i]);
  }

  private dispatch(b: Batch<K, V>): void {
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
          this.forget(b, i);
          cb.reject(v);
        } else cb.resolve(v);
      });
    }, fail);
  }
}
