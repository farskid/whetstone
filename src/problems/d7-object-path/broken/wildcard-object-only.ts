// Bug: wildcards skip array elements
export type PathKey = string | number;
export interface Match {
  path: PathKey[];
  value: unknown;
}

type Segment = { kind: 'key'; key: PathKey } | { kind: 'wildcard' } | { kind: 'filter'; expr: Expr };

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
      } else if (n === '?') {
        if (path[i + 2] !== '(') throw new Error('Invalid path');
        let j = i + 3;
        let depth = 1;
        let q = '';
        for (; j < path.length && depth > 0; j++) {
          const ch = path[j];
          if (q) { if (ch === '\\') j++; else if (ch === q) q = ''; }
          else if (ch === '"' || ch === "'") q = ch;
          else if (ch === '(') depth++;
          else if (ch === ')') depth--;
        }
        if (depth !== 0 || path[j] !== ']') throw new Error('Invalid path');
        segs.push({ kind: 'filter', expr: parseExpr(path.slice(i + 3, j - 1)) });
        i = j + 1;
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
    if (s.kind !== 'key') throw new Error('Wildcards and filters are only allowed in query');
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
  if (Array.isArray(v)) return v.map((value, i) => ({ path: [String(i)], value }));
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
        for (const c of children(m.value)) {
          if (seg.kind === 'wildcard' || truthy(evaluate(seg.expr, c.value))) next.push({ path: [...m.path, ...c.path], value: c.value });
        }
      }
    }
    matches = next;
  }
  return matches;
}

// ---- filter expressions ----
type Expr =
  | { t: 'lit'; v: unknown }
  | { t: 'ref'; path: PathKey[] }
  | { t: 'bin'; op: string; l: Expr; r: Expr };

function tokenize(src: string): string[] {
  const re = /\s*(&&|\|\||==|!=|>=|<=|>|<|\(|\)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@(?:\.[A-Za-z_$][\w$]*|\[\d+\]|\['[^']*'\]|\["[^"]*"\])*|-?\d+(?:\.\d+)?|[A-Za-z_]\w*)\s*/y;
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new Error(`Invalid filter: ${src}`);
    out.push(m[1]);
    i = re.lastIndex;
  }
  return out;
}

function parseExpr(src: string): Expr {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const or = (): Expr => {
    let l = and();
    while (peek() === '||') { p++; l = { t: 'bin', op: '||', l, r: and() }; }
    return l;
  };
  const and = (): Expr => {
    let l = cmp();
    while (peek() === '&&') { p++; l = { t: 'bin', op: '&&', l, r: cmp() }; }
    return l;
  };
  const cmp = (): Expr => {
    const l = atom();
    const op = peek();
    if (op && ['==', '!=', '>', '>=', '<', '<=', 'contains'].includes(op)) { p++; return { t: 'bin', op, l, r: atom() }; }
    return l;
  };
  const atom = (): Expr => {
    const tok = toks[p++];
    if (tok === undefined) throw new Error(`Invalid filter: ${src}`);
    if (tok === '(') {
      const e = or();
      if (toks[p++] !== ')') throw new Error(`Invalid filter: ${src}`);
      return e;
    }
    if (tok[0] === '@') return { t: 'ref', path: keysOnly(tok.slice(1).replace(/^\./, '')) };
    if (tok[0] === '"' || tok[0] === "'") return { t: 'lit', v: tok.slice(1, -1).replace(/\\(.)/g, '$1') };
    if (/^-?\d/.test(tok)) return { t: 'lit', v: Number(tok) };
    if (tok === 'true' || tok === 'false') return { t: 'lit', v: tok === 'true' };
    if (tok === 'null') return { t: 'lit', v: null };
    throw new Error(`Invalid filter: ${src}`);
  };
  const e = or();
  if (p !== toks.length) throw new Error(`Invalid filter: ${src}`);
  return e;
}

function truthy(v: unknown): boolean {
  return Boolean(v);
}

function evaluate(e: Expr, at: unknown): unknown {
  if (e.t === 'lit') return e.v;
  if (e.t === 'ref') return get(at, e.path);
  if (e.op === '&&') return truthy(evaluate(e.l, at)) && truthy(evaluate(e.r, at));
  if (e.op === '||') return truthy(evaluate(e.l, at)) || truthy(evaluate(e.r, at));
  const l = evaluate(e.l, at);
  const r = evaluate(e.r, at);
  switch (e.op) {
    case '==': return l === r;
    case '!=': return l !== r;
    case 'contains':
      return Array.isArray(l) ? l.includes(r) : typeof l === 'string' && typeof r === 'string' && l.includes(r);
  }
  if (typeof l !== typeof r || (typeof l !== 'number' && typeof l !== 'string')) return false;
  const a = l as number | string;
  const b = r as number | string;
  return e.op === '>' ? a > b : e.op === '>=' ? a >= b : e.op === '<' ? a < b : a <= b;
}
