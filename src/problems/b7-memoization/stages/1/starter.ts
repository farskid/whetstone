type AnyFn = (...args: any[]) => any;

export function memoizeOne<F extends AnyFn>(fn: F): F {
  throw new Error('Not implemented');
}
