import type { Operation } from './types';

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

function cloneValue<T>(v: T): T {
  if (v instanceof Date) return new Date(v.getTime()) as T;
  if (Array.isArray(v)) return v.map(cloneValue) as T;
  if (isObj(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = cloneValue(v[k]);
    return out as T;
  }
  return v;
}

export const escapeToken = (t: string) => t.replace(/~/g, '~0').replace(/\//g, '~1');
export const unescapeToken = (t: string) => t.replace(/~1/g, '/').replace(/~0/g, '~');

export function diff(a: unknown, b: unknown): Operation[] {
  const ops: Operation[] = [];
  walk(a, b, '', ops);
  return ops;
}

function walk(a: unknown, b: unknown, path: string, ops: Operation[]) {
  if (isEqual(a, b)) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    const common = Math.min(a.length, b.length);
    for (let i = 0; i < common; i++) walk(a[i], b[i], `${path}/${i}`, ops);
    for (let i = a.length - 1; i >= b.length; i--) ops.push({ op: 'remove', path: `${path}/${i}` });
    for (let i = a.length; i < b.length; i++) ops.push({ op: 'add', path: `${path}/${i}`, value: cloneValue(b[i]) });
    return;
  }
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) if (!Object.prototype.hasOwnProperty.call(b, k)) ops.push({ op: 'remove', path: `${path}/${escapeToken(k)}` });
    for (const k of Object.keys(b)) {
      const p = `${path}/${escapeToken(k)}`;
      if (!Object.prototype.hasOwnProperty.call(a, k)) ops.push({ op: 'add', path: p, value: cloneValue(b[k]) });
      else walk(a[k], b[k], p, ops);
    }
    return;
  }
  ops.push({ op: 'replace', path, value: cloneValue(b) });
}
