type AnyFn = (...args: any[]) => any;

const shallowEqual = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

export function memoizeOne<F extends AnyFn>(fn: F, isEqual: (newArgs: unknown[], lastArgs: unknown[]) => boolean = shallowEqual): F {
  let last: { self: unknown; args: unknown[]; result: unknown } | null = null;
  return function (this: unknown, ...args: unknown[]) {
    if (last && last.self === this && isEqual(args, last.args)) return last.result;
    const result = fn.apply(this, args); // a throw leaves `last` untouched
    last = { self: this, args, result };
    return result;
  } as F;
}
