import type { SemVer } from './types';

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
