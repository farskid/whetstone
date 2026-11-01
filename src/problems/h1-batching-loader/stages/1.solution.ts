export type BatchFn<K, V> = (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>;

interface Pending<K, V> { key: K; resolve: (v: V) => void; reject: (e: unknown) => void }

export class Loader<K, V> {
  private queue: Pending<K, V>[] | null = null;

  constructor(private readonly batchFn: BatchFn<K, V>) {}

  load(key: K): Promise<V> {
    if (key === null || key === undefined) throw new TypeError(`load() needs a key, got ${String(key)}`);
    if (!this.queue) {
      const queue: Pending<K, V>[] = [];
      this.queue = queue;
      queueMicrotask(() => this.dispatch(queue));
    }
    const queue = this.queue;
    return new Promise<V>((resolve, reject) => { queue.push({ key, resolve, reject }); });
  }

  private dispatch(queue: Pending<K, V>[]): void {
    if (this.queue === queue) this.queue = null;
    const keys = queue.map((p) => p.key);
    const fail = (err: unknown) => queue.forEach((p) => p.reject(err));
    let result: PromiseLike<ArrayLike<V | Error>>;
    try { result = this.batchFn(keys); } catch (e) { fail(e); return; }
    Promise.resolve(result).then((values) => {
      queue.forEach((p, i) => p.resolve(values[i] as V));
    }, fail);
  }
}
