import type { PathKey, Match } from './types';

type Segment = { kind: 'key'; key: PathKey } | { kind: 'wildcard' };

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function parsePath(path: string | PathKey[]): Segment[] {
  if (Array.isArray(path)) return path.map((key) => ({ kind: 'key', key }));
  const segs: Segment[] = [];
  let i = 0;
  const bare = (s: string): Segment => (s === '*' ? { kind: 'wildcard' } : { kind: 'key', key: /^\d+$/.test(s) ? Number(s) : s });
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
        segs.push({ kind: 'key', key: s });
        i = j + 2;
      } else {
        const j = path.indexOf(']', i);
        if (j < 0) throw new Error('Invalid path');
        const inner = path.slice(i + 1, j).trim();
        if (inner === '*') segs.push({ kind: 'wildcard' });
        else if (/^\d+$/.test(inner)) segs.push({ kind: 'key', key: Number(inner) });
        else throw new Error('Invalid path');
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

function keysOnly(path: string | PathKey[]): PathKey[] {
  return parsePath(path).map((s) => {
    if (s.kind !== 'key') throw new Error('Wildcards are only allowed in query');
    return s.key;
  });
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
  for (const key of keysOnly(path)) {
    const r = child(cur, key);
    if (!r.ok) return defaultValue;
    cur = r.value;
  }
  return cur === undefined ? defaultValue : cur;
}

function checkKeys(keys: PathKey[]) {
  for (const k of keys) if (FORBIDDEN.has(String(k))) throw new Error(`Forbidden key: ${k}`);
}

export function set<T extends object>(obj: T, path: string | PathKey[], value: unknown): T {
  const keys = keysOnly(path);
  if (keys.length === 0) throw new Error('Empty path');
  checkKeys(keys);
  let cur = obj as Record<PathKey, unknown>;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) { cur[key] = value; return; }
    if (!isObj(cur[key])) cur[key] = typeof keys[i + 1] === 'number' ? [] : {};
    cur = cur[key] as Record<PathKey, unknown>;
  });
  return obj;
}

export function setIn<T>(obj: T, path: string | PathKey[], value: unknown): T {
  const keys = keysOnly(path);
  if (keys.length === 0) throw new Error('Empty path');
  checkKeys(keys);
  const go = (node: unknown, i: number): unknown => {
    const key = keys[i];
    const copy: Record<PathKey, unknown> = Array.isArray(node)
      ? (node.slice() as unknown as Record<PathKey, unknown>)
      : isObj(node) ? { ...node } : typeof key === 'number' ? ([] as unknown as Record<PathKey, unknown>) : {};
    copy[key] = i === keys.length - 1 ? value : go(isObj(node) ? node[key] : undefined, i + 1);
    return copy;
  };
  return go(obj, 0) as T;
}

function children(v: unknown): Match[] {
  if (Array.isArray(v)) return v.map((value, i) => ({ path: [i], value }));
  if (isObj(v)) return Object.keys(v).map((k) => ({ path: [k], value: v[k] }));
  return [];
}

export function query(obj: unknown, path: string): Match[] {
  let matches: Match[] = [{ path: [], value: obj }];
  for (const seg of parsePath(path)) {
    const next: Match[] = [];
    for (const m of matches) {
      if (seg.kind === 'key') {
        const r = child(m.value, seg.key);
        if (r.ok) next.push({ path: [...m.path, seg.key], value: r.value });
      } else {
        for (const c of children(m.value)) next.push({ path: [...m.path, ...c.path], value: c.value });
      }
    }
    matches = next;
  }
  return matches;
}
