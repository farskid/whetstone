import type {} from './types';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b || (a !== a && b !== b)) return true;
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && isEqual(a.getTime(), b.getTime());
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => isEqual(x, b[i]));
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && isEqual(a[k], b[k]));
  }
  return false;
}
