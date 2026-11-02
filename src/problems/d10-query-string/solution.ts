import type { ParseOptions, StringifyOptions } from './types';

type Value = string | Value[] | { [k: string]: Value };

const BLOCKED = new Set(['__proto__', 'constructor', 'prototype']);

function decode(s: string): string {
  const plus = s.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(plus);
  } catch {
    return plus;
  }
}

export function splitKey(key: string, depth: number): string[] {
  const first = key.indexOf('[');
  if (first <= 0) return [key];
  const segs = [key.slice(0, first)];
  let rest = key.slice(first);
  while (rest.startsWith('[') && segs.length <= depth) {
    const close = rest.indexOf(']');
    if (close < 0) return [key];
    segs.push(rest.slice(1, close));
    rest = rest.slice(close + 1);
  }
  if (rest) segs.push(rest);
  return segs;
}

const isIndex = (s: string, limit: number) => /^(0|[1-9]\d*)$/.test(s) && Number(s) <= limit;

export function parse(input: string, opts: ParseOptions = {}): Record<string, Value> {
  const depth = opts.depth ?? 5;
  const limit = opts.parameterLimit ?? 1000;
  const arrayLimit = opts.arrayLimit ?? 20;
  const root: Record<string, Value> = {};
  const parts = input.replace(/^\?/, '').split('&').filter(Boolean).slice(0, limit);
  for (const part of parts) {
    const eq = part.indexOf('=');
    const key = decode(eq < 0 ? part : part.slice(0, eq));
    const val = eq < 0 ? '' : decode(part.slice(eq + 1));
    const segs = splitKey(key, depth);
    if (segs.some((s) => BLOCKED.has(s))) continue;
    let parent: any = root;
    let grandparent: any = null;
    let parentKey = '';
    let ok = true;
    for (let i = 0; i < segs.length - 1 && ok; i++) {
      const seg = segs[i];
      const nextSeg = segs[i + 1];
      if (Array.isArray(parent) && !(seg === '' || isIndex(seg, arrayLimit))) {
        parent = Object.assign({}, parent);
        grandparent[parentKey] = parent;
      }
      const wantArray = nextSeg === '' || isIndex(nextSeg, arrayLimit);
      let child: any;
      if (seg === '') {
        if (!Array.isArray(parent)) { ok = false; break; }
        child = wantArray ? [] : {};
        parent.push(child);
        grandparent = parent; parentKey = String(parent.length - 1);
        parent = child;
        continue;
      }
      child = parent[seg];
      if (child === undefined) {
        child = wantArray ? [] : {};
        parent[seg] = child;
      } else if (typeof child === 'string') {
        ok = false;
        break;
      }
      grandparent = parent; parentKey = seg;
      parent = child;
    }
    if (!ok) continue;
    const last = segs[segs.length - 1];
    if (Array.isArray(parent) && !(last === '' || isIndex(last, arrayLimit))) {
      parent = Object.assign({}, parent);
      grandparent[parentKey] = parent;
    }
    if (last === '') {
      if (Array.isArray(parent)) parent.push(val);
      continue;
    }
    const cur = parent[last];
    if (cur === undefined) parent[last] = val;
    else if (typeof cur === 'string') parent[last] = [cur, val];
    else if (Array.isArray(cur)) cur.push(val);
  }
  return compact(root) as Record<string, Value>;
}

function compact(v: any): any {
  if (Array.isArray(v)) return v.filter(() => true).map(compact);
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) v[k] = compact(v[k]);
  }
  return v;
}

const enc = (s: string) => encodeURIComponent(s);

export function stringify(obj: Record<string, unknown>, opts: StringifyOptions = {}): string {
  const format = opts.arrayFormat ?? 'indices';
  const out: string[] = [];
  const walk = (prefix: string, v: unknown) => {
    if (v === undefined || typeof v === 'function') return;
    if (v === null) { out.push(`${prefix}=`); return; }
    if (v instanceof Date) { out.push(`${prefix}=${enc(v.toISOString())}`); return; }
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        const k = format === 'indices' ? `${prefix}[${i}]` : format === 'brackets' ? `${prefix}[]` : prefix;
        walk(k, item);
      });
      return;
    }
    if (typeof v === 'object') {
      for (const k of Object.keys(v as object)) walk(`${prefix}[${enc(k)}]`, (v as any)[k]);
      return;
    }
    out.push(`${prefix}=${enc(String(v))}`);
  };
  for (const k of Object.keys(obj)) walk(enc(k), obj[k]);
  return out.join('&');
}
