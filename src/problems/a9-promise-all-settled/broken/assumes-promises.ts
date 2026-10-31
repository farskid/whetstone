// Bug: calls .then directly on each input, so plain values blow up, and forgets empty input.
export type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

export function allSettled<T>(inputs: Iterable<T | PromiseLike<T>>): Promise<SettledResult<T>[]> {
  const items = Array.from(inputs) as PromiseLike<T>[];
  return new Promise((resolve, reject) => {
    const results: SettledResult<T>[] = new Array(items.length);
    let remaining = items.length;
    try {
      items.forEach((item, i) => {
        item.then(
          (value) => { results[i] = { status: 'fulfilled', value }; if (--remaining === 0) resolve(results); },
          (reason) => { results[i] = { status: 'rejected', reason }; if (--remaining === 0) resolve(results); },
        );
      });
    } catch (e) { reject(e); }
    if (items.length === 0) setTimeout(() => resolve(results), 10);
  });
}
