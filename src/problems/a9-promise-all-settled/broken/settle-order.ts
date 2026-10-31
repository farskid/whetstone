// Bug: pushes results in the order inputs settle, not input order.
export type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

export function allSettled<T>(inputs: Iterable<T | PromiseLike<T>>): Promise<SettledResult<T>[]> {
  const items = Array.from(inputs);
  return new Promise((resolve) => {
    const results: SettledResult<T>[] = [];
    if (items.length === 0) return resolve(results);
    items.forEach((item) => {
      Promise.resolve(item).then(
        (value) => { results.push({ status: 'fulfilled', value }); },
        (reason) => { results.push({ status: 'rejected', reason }); },
      ).then(() => {
        if (results.length === items.length) resolve(results);
      });
    });
  });
}
