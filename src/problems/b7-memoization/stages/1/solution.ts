type AnyFn = (...args: any[]) => any;

const shallowEqual = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

export function memoizeOne<F extends AnyFn>(fn: F): F {
  let last: { args: unknown[]; result: unknown } | null = null;
  return ((...args: unknown[]) => {
    if (last && shallowEqual(args, last.args)) return last.result;
    const result = fn(...args);
    last = { args, result };
    return result;
  }) as F;
}
