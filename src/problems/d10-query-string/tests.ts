import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Flat pairs';
const G2 = 'Nesting';
const G3 = 'Security limits';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'flat pairs, repeated keys, + as space, keys without values',
    run({ parse }, { expect }) {
      expect(parse('?a=1&b=2&a=3&&c+d=e+f&flag&eq=x=y')).toEqual({ a: ['1', '3'], b: '2', 'c d': 'e f', flag: '', eq: 'x=y' });
    },
  },
  {
    group: G1,
    title: 'percent-decoding; malformed sequences stay literal',
    run({ parse }, { expect }) {
      expect(parse('q=caf%C3%A9%20au+lait&bad=%E0%A4%A&pct=100%')).toEqual({ q: 'café au lait', bad: '%E0%A4%A', pct: '100%' });
    },
  },
  {
    group: G1,
    title: 'stringify encodes and keeps key order',
    run({ stringify }, { expect }) {
      expect(stringify({ z: 'last?', a: '1 2', amp: 'a&b=c', n: 3, t: true, nil: null, skip: undefined })).toBe('z=last%3F&a=1%202&amp=a%26b%3Dc&n=3&t=true&nil=');
      expect(stringify({ when: new Date(Date.UTC(2026, 0, 2)) })).toBe('when=2026-01-02T00%3A00%3A00.000Z');
    },
  },
  {
    group: G2,
    title: 'nested objects and [] arrays',
    run({ parse }, { expect }) {
      expect(parse('user[name]=Sam&user[address][city]=Espoo&user[tags][]=a&user[tags][]=b')).toEqual({
        user: { name: 'Sam', address: { city: 'Espoo' }, tags: ['a', 'b'] },
      });
      expect(parse('rows[][id]=1&rows[][id]=2')).toEqual({ rows: [{ id: '1' }, { id: '2' }] });
    },
  },
  {
    group: G2,
    title: 'indices: out of order and sparse arrays compact; objects in arrays',
    run({ parse }, { expect }) {
      expect(parse('a[1]=b&a[0]=a&s[5]=x&s[2]=w')).toEqual({ a: ['a', 'b'], s: ['w', 'x'] });
      expect(parse('o[0][name]=a&o[1][name]=b&o[0][v]=1')).toEqual({ o: [{ name: 'a', v: '1' }, { name: 'b' }] });
    },
  },
  {
    group: G2,
    title: 'mixed keys turn arrays into objects; conflicting shapes ignore the later pair',
    run({ parse }, { expect }) {
      expect(parse('m[0]=z&m[k]=w')).toEqual({ m: { 0: 'z', k: 'w' } });
      expect(parse('s=1&s[x]=2&t[x]=1&t=2')).toEqual({ s: '1', t: { x: '1' } });
      expect(parse('l[]=1&l=2&l[]=3')).toEqual({ l: ['1', '2', '3'] });
    },
  },
  {
    group: G2,
    title: 'stringify array formats and round trips',
    run({ parse, stringify }, { expect }) {
      const value = { user: { name: 'Sam O', tags: ['a', 'b&c'], prefs: { theme: 'dark' } }, list: [{ id: '1' }, { id: '2' }], 'odd key': '=' };
      const s = stringify(value);
      expect(s).toBe('user[name]=Sam%20O&user[tags][0]=a&user[tags][1]=b%26c&user[prefs][theme]=dark&list[0][id]=1&list[1][id]=2&odd%20key=%3D');
      expect(parse(s)).toEqual(value);
      expect(stringify({ a: ['x', 'y'] }, { arrayFormat: 'brackets' })).toBe('a[]=x&a[]=y');
      expect(stringify({ a: ['x', 'y'] }, { arrayFormat: 'repeat' })).toBe('a=x&a=y');
      expect(parse(stringify({ a: ['x', 'y'] }, { arrayFormat: 'repeat' }))).toEqual({ a: ['x', 'y'] });
    },
  },
  {
    group: G3,
    title: 'depth limit keeps the rest as one literal key',
    run({ parse }, { expect }) {
      expect(parse('a[b][c][d][e][f][g][h]=1')).toEqual({ a: { b: { c: { d: { e: { f: { '[g][h]': '1' } } } } } } });
      expect(parse('a[b][c][d]=1', { depth: 1 })).toEqual({ a: { b: { '[c][d]': '1' } } });
      expect(parse('[x]=1&a[b=2')).toEqual({ '[x]': '1', 'a[b': '2' });
    },
  },
  {
    group: G3,
    title: 'parameter limit and array index cap',
    run({ parse }, { expect }) {
      const many = Array.from({ length: 50 }, (_, i) => `k${i}=${i}`).join('&');
      expect(Object.keys(parse(many, { parameterLimit: 10 })).length).toBe(10);
      expect(parse('a[999999]=x')).toEqual({ a: { 999999: 'x' } });
      expect(parse('a[20]=x&b[21]=y')).toEqual({ a: ['x'], b: { 21: 'y' } });
      expect(parse('a[3]=x', { arrayLimit: 2 })).toEqual({ a: { 3: 'x' } });
    },
  },
  {
    group: G3,
    title: 'prototype pollution is blocked',
    run({ parse }, { expect }) {
      try {
        const out = parse('__proto__[polluted]=1&a[constructor][prototype][x]=1&b[__proto__]=2&c[prototype]=3&ok=1');
        expect(out).toEqual({ ok: '1' });
        expect(({} as any).polluted).toBeUndefined();
        expect(({} as any).x).toBeUndefined();
        expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
      } finally {
        // Undo any pollution so a broken solution can't leak into later tests.
        delete (Object.prototype as any).polluted;
        delete (Object.prototype as any).x;
      }
    },
  },
];
