export type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

export function allSettled<T>(inputs: Iterable<T | PromiseLike<T>>): Promise<SettledResult<T>[]> {
  const items = Array.from(inputs);
  return new Promise((resolve) => {
    const results: SettledResult<T>[] = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) return resolve(results);
    items.forEach((item, i) => {
      Promise.resolve(item).then(
        (value) => { results[i] = { status: 'fulfilled', value }; },
        (reason) => { results[i] = { status: 'rejected', reason }; },
      ).then(() => {
        if (--remaining === 0) resolve(results);
      });
    });
  });
}
