// Bug: satisfies throws on an invalid version
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: Array<string | number>;
  build: string[];
}

const IDENT = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const VERSION = new RegExp(
  `^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-(${IDENT}(?:\\.${IDENT})*))?(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$`,
);

export function parse(input: string): SemVer | null {
  if (typeof input !== 'string') return null;
  const m = VERSION.exec(input.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ? m[4].split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id)) : [],
    build: m[5] ? m[5].split('.') : [],
  };
}

function cmpIdent(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return Math.sign(a - b);
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function cmp(a: SemVer, b: SemVer): number {
  const main = Math.sign(a.major - b.major) || Math.sign(a.minor - b.minor) || Math.sign(a.patch - b.patch);
  if (main) return main;
  if (!a.prerelease.length || !b.prerelease.length) return Math.sign(b.prerelease.length - a.prerelease.length) as number;
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    if (i >= a.prerelease.length) return -1;
    if (i >= b.prerelease.length) return 1;
    const c = cmpIdent(a.prerelease[i], b.prerelease[i]);
    if (c) return c;
  }
  return 0;
}

function must(v: string): SemVer {
  const p = parse(v);
  if (!p) throw new TypeError(`Invalid version: ${v}`);
  return p;
}

export function compare(a: string, b: string): -1 | 0 | 1 {
  return cmp(must(a), must(b)) as -1 | 0 | 1;
}

type Op = '<' | '<=' | '>' | '>=' | '=';
type Comparator = { op: Op; v: SemVer } | 'any' | 'none';

const ver = (major: number, minor: number, patch: number, prerelease: Array<string | number> = []): SemVer => ({ major, minor, patch, prerelease, build: [] });

const PART = '(\\*|x|X|0|[1-9]\\d*)';
const COMP = new RegExp(`^(<=|>=|<|>|=|\\^|~>?|)v?${PART}(?:\\.${PART}(?:\\.${PART}(?:-(${IDENT}(?:\\.${IDENT})*))?(?:\\+[0-9A-Za-z.-]+)?)?)?$`);

interface Partial {
  op: string;
  M: number | null;
  m: number | null;
  p: number | null;
  pre: Array<string | number>;
}

function partial(token: string): Partial | null {
  const r = COMP.exec(token);
  if (!r) return null;
  const n = (s: string | undefined) => (s === undefined || /^[*xX]$/.test(s) ? null : Number(s));
  let M = n(r[2]);
  let m = n(r[3]);
  let p = n(r[4]);
  if (M === null) { m = null; p = null; }
  if (m === null) p = null;
  const pre = p !== null && r[5] ? (parse(`0.0.0-${r[5]}`) as SemVer).prerelease : [];
  return { op: r[1], M, m, p, pre };
}

function lower(x: Partial): SemVer {
  return ver(x.M ?? 0, x.m ?? 0, x.p ?? 0, x.pre);
}

// The first version above every version the partial covers.
function upperExclusive(x: Partial): SemVer {
  if (x.m === null) return ver(x.M! + 1, 0, 0);
  return ver(x.M!, x.m + 1, 0);
}

function desugar(x: Partial): Comparator[] {
  const { op, M, m, p } = x;
  const full = p !== null;
  if (M === null) return op === '<' || op === '>' ? ['none'] : ['any'];
  switch (op) {
    case '^': {
      let hi: SemVer;
      if (M > 0 || m === null) hi = ver(M + 1, 0, 0);
      else if (m > 0 || p === null) hi = ver(0, m + 1, 0);
      else hi = ver(0, 0, p + 1);
      return [{ op: '>=', v: lower(x) }, { op: '<', v: hi }];
    }
    case '~':
    case '~>':
      return [{ op: '>=', v: lower(x) }, { op: '<', v: m === null ? ver(M + 1, 0, 0) : ver(M, m + 1, 0) }];
    case '>':
      return [full ? { op: '>', v: lower(x) } : { op: '>=', v: upperExclusive(x) }];
    case '>=':
      return [{ op: '>=', v: lower(x) }];
    case '<':
      return [{ op: '<', v: lower(x) }];
    case '<=':
      return [full ? { op: '<=', v: lower(x) } : { op: '<', v: upperExclusive(x) }];
    default:
      return full ? [{ op: '=', v: lower(x) }] : [{ op: '>=', v: lower(x) }, { op: '<', v: upperExclusive(x) }];
  }
}

function parseRange(range: string): Comparator[][] | null {
  if (typeof range !== 'string') return null;
  const sets: Comparator[][] = [];
  for (const raw of range.split('||')) {
    const part = raw.trim().replace(/(<=|>=|<|>|=|\^|~>?)\s+/g, '$1');
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(part);
    if (hyphen) {
      const a = partial(hyphen[1]);
      const b = partial(hyphen[2]);
      if (!a || !b || a.op || b.op) return null;
      const set: Comparator[] = [a.M === null ? 'any' : { op: '>=', v: lower(a) }];
      if (b.M === null) set.push('any');
      else set.push(b.p !== null ? { op: '<=', v: lower(b) } : { op: '<', v: upperExclusive(b) });
      sets.push(set);
      continue;
    }
    const set: Comparator[] = [];
    for (const tok of part === '' ? ['*'] : part.split(/\s+/)) {
      const x = partial(tok);
      if (!x) return null;
      set.push(...desugar(x));
    }
    sets.push(set);
  }
  return sets;
}

function test(c: Comparator, v: SemVer): boolean {
  if (c === 'any') return true;
  if (c === 'none') return false;
  const r = cmp(v, c.v);
  switch (c.op) {
    case '<': return r < 0;
    case '<=': return r <= 0;
    case '>': return r > 0;
    case '>=': return r >= 0;
    default: return r === 0;
  }
}

function testSet(set: Comparator[], v: SemVer): boolean {
  if (!set.every((c) => test(c, v))) return false;
  if (!v.prerelease.length) return true;
  return set.some(
    (c) => typeof c === 'object' && c.v.prerelease.length > 0 && c.v.major === v.major && c.v.minor === v.minor && c.v.patch === v.patch,
  );
}

export function satisfies(version: string, range: string): boolean {
  const v = must(version);
  const sets = parseRange(range);
  if (!v || !sets) return false;
  return sets.some((s) => testSet(s, v));
}

export function maxSatisfying(versions: string[], range: string): string | null {
  const sets = parseRange(range);
  if (!sets) return null;
  let best: { s: string; v: SemVer } | null = null;
  for (const s of versions) {
    const v = parse(s);
    if (!v || !sets.some((set) => testSet(set, v))) continue;
    if (!best || cmp(v, best.v) > 0) best = { s, v };
  }
  return best ? best.s : null;
}
