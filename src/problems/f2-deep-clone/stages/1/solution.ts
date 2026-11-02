import type {} from './types';

export function clone<T>(value: T): T {
  return copy(value) as T;
}

function copy(v: unknown): unknown {
  if (typeof v === 'function') throw new TypeError('Cannot clone a function');
  if (typeof v === 'symbol') throw new TypeError('Cannot clone a symbol value');
  if (typeof v !== 'object' || v === null) return v;
  if (Array.isArray(v)) return v.map(copy);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v)) out[k] = copy((v as Record<string, unknown>)[k]);
  return out;
}
