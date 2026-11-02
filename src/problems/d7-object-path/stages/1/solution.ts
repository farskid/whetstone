import type { PathKey } from './types';

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function parsePath(path: string | PathKey[]): PathKey[] {
  if (Array.isArray(path)) return path;
  const segs: PathKey[] = [];
  let i = 0;
  const bare = (s: string): PathKey => {
    if (s === '*') throw new Error('Wildcards are not supported');
    return /^\d+$/.test(s) ? Number(s) : s;
  };
  while (i < path.length) {
    const c = path[i];
    if (c === '.') {
      i++;
      if (i >= path.length || path[i] === '.' || path[i] === '[') throw new Error('Invalid path');
      continue;
    }
    if (c === '[') {
      const n = path[i + 1];
      if (n === '"' || n === "'") {
        let j = i + 2;
        let s = '';
        while (j < path.length && path[j] !== n) {
          if (path[j] === '\\') j++;
          s += path[j++] ?? '';
        }
        if (path[j + 1] !== ']') throw new Error('Invalid path');
        segs.push(s);
        i = j + 2;
      } else {
        const j = path.indexOf(']', i);
        if (j < 0) throw new Error('Invalid path');
        const inner = path.slice(i + 1, j).trim();
        if (!/^\d+$/.test(inner)) throw new Error('Invalid path');
        segs.push(Number(inner));
        i = j + 1;
      }
      continue;
    }
    let j = i;
    while (j < path.length && path[j] !== '.' && path[j] !== '[') j++;
    segs.push(bare(path.slice(i, j)));
    i = j;
  }
  return segs;
}

function isObj(v: unknown): v is Record<PathKey, unknown> {
  return typeof v === 'object' && v !== null;
}

function child(v: unknown, key: PathKey): { ok: boolean; value?: unknown } {
  if (!isObj(v) || FORBIDDEN.has(String(key))) return { ok: false };
  if (!Object.prototype.hasOwnProperty.call(v, key)) return { ok: false };
  return { ok: true, value: v[key] };
}

export function get(obj: unknown, path: string | PathKey[], defaultValue?: unknown): unknown {
  let cur = obj;
  for (const key of parsePath(path)) {
    const r = child(cur, key);
    if (!r.ok) return defaultValue;
    cur = r.value;
  }
  return cur === undefined ? defaultValue : cur;
}
