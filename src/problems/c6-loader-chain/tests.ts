import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');
type Loader = import('./solution').Loader;

const G1 = 'Loader chain';
const G2 = 'Async and options';
const G3 = 'Pitch phase';
const G4 = 'Data and dependencies';

function fsOf(files: Record<string, string>) {
  const reads: string[] = [];
  return { reads, readResource: (p: string) => { reads.push(p); if (!(p in files)) throw new Error('ENOENT ' + p); return files[p]; } };
}
const tagger = (tag: string): Loader => function (src) { return `${tag}(${src})`; };

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'loaders apply right to left to the resource',
    async run({ runLoaders }, { expect }) {
      const fs = fsOf({ '/a.txt': 'src' });
      const out = await runLoaders({ resource: '/a.txt', loaders: ['a', 'b', 'c'], registry: { a: tagger('a'), b: tagger('b'), c: tagger('c') }, readResource: fs.readResource });
      expect(out.result).toBe('a(b(c(src)))');
      expect(fs.reads).toEqual(['/a.txt']);
      const none = await runLoaders({ resource: '/a.txt', loaders: [], registry: {}, readResource: fs.readResource });
      expect(none.result).toBe('src');
    },
  },
  {
    group: G1,
    title: 'unknown loaders and read errors reject',
    async run({ runLoaders }, { expect }) {
      const fs = fsOf({ '/a': 'x' });
      await expect(runLoaders({ resource: '/a', loaders: ['ghost'], registry: {}, readResource: fs.readResource })).toReject('ghost');
      await expect(runLoaders({ resource: '/missing', loaders: [], registry: {}, readResource: fs.readResource })).toReject('ENOENT');
    },
  },
  {
    group: G2,
    title: 'async loaders: this.async() callback and returned promises',
    async run({ runLoaders }, { expect }) {
      const fs = fsOf({ '/f': 'x' });
      const viaCallback: Loader = function (src) { const cb = this.async(); setTimeout(() => cb(null, `cb(${src})`), 0); return 'ignored'; };
      const viaPromise: Loader = async function (src) { await Promise.resolve(); return `p(${src})`; };
      const out = await runLoaders({ resource: '/f', loaders: ['cb', 'p'], registry: { cb: viaCallback, p: viaPromise }, readResource: async (p) => fs.readResource(p) });
      expect(out.result).toBe('cb(p(x))');
    },
  },
  {
    group: G2,
    title: 'options come from the loader query string or JSON',
    async run({ runLoaders, parseLoader }, { expect }) {
      expect(parseLoader('css?modules=1&name=a%20b')).toEqual({ name: 'css', options: { modules: '1', name: 'a b' } });
      expect(parseLoader('css?{"modules":true,"n":2}')).toEqual({ name: 'css', options: { modules: true, n: 2 } });
      expect(parseLoader('plain')).toEqual({ name: 'plain', options: {} });
      const seen: unknown[] = [];
      const opt: Loader = function (src) { seen.push(this.options); return src; };
      await runLoaders({ resource: '/r', loaders: ['opt?x=1', 'opt'], registry: { opt }, readResource: () => 's' });
      expect(seen).toEqual([{}, { x: '1' }]);
    },
  },
  {
    group: G2,
    title: 'errors carry the loader name and the original cause',
    async run({ runLoaders }, { expect }) {
      const boom = new Error('bad syntax');
      const throws: Loader = function () { throw boom; };
      const rejects: Loader = async function () { throw new Error('async bad'); };
      const cbErr: Loader = function () { this.async()(new Error('cb bad')); };
      const run = (name: string, fn: Loader) => runLoaders({ resource: '/r', loaders: [name], registry: { [name]: fn }, readResource: () => 's' });
      let caught: any;
      try { await run('babel', throws); } catch (e) { caught = e; }
      expect(caught?.message).toBe('babel: bad syntax');
      expect(caught?.cause).toBe(boom);
      await expect(run('ts', rejects)).toReject('ts: async bad');
      await expect(run('sass', cbErr)).toReject('sass: cb bad');
    },
  },
  {
    group: G2,
    title: 'calling the async callback twice throws; undefined results reject',
    async run({ runLoaders }, { expect }) {
      let second: unknown;
      const twice: Loader = function (src) { const cb = this.async(); cb(null, 'first'); try { cb(null, 'second'); } catch (e) { second = e; } };
      const out = await runLoaders({ resource: '/r', loaders: ['twice'], registry: { twice }, readResource: () => 's' });
      expect(out.result).toBe('first');
      expect(second instanceof Error, 'second call throws').toBe(true);
      const nothing: Loader = function () { return undefined; };
      await expect(runLoaders({ resource: '/r', loaders: ['nothing'], registry: { nothing }, readResource: () => 's' })).toReject('nothing: did not return a result');
    },
  },
  {
    group: G3,
    title: 'pitch runs left to right before the read, with remaining and preceding requests',
    async run({ runLoaders }, { expect }) {
      const log: string[] = [];
      const mk = (name: string): Loader => {
        const fn: Loader = function (src) { log.push('normal ' + name); return `${name}(${src})`; };
        fn.pitch = function (remaining, preceding) { log.push(`pitch ${name} [${remaining}] [${preceding}]`); };
        return fn;
      };
      const out = await runLoaders({
        resource: '/x.css', loaders: ['a', 'b?m=1', 'c'], registry: { a: mk('a'), b: mk('b'), c: mk('c') },
        readResource: () => { log.push('read'); return 'css'; },
      });
      expect(out.result).toBe('a(b(c(css)))');
      expect(log).toEqual([
        'pitch a [b?m=1!c!/x.css] []',
        'pitch b [c!/x.css] [a]',
        'pitch c [/x.css] [a!b?m=1]',
        'read', 'normal c', 'normal b', 'normal a',
      ]);
    },
  },
  {
    group: G3,
    title: 'a pitch result short-circuits: only earlier loaders run their normal phase',
    async run({ runLoaders }, { expect }) {
      const log: string[] = [];
      const mk = (name: string, pitchResult?: unknown): Loader => {
        const fn: Loader = function (src) { log.push('normal ' + name); return `${name}(${src})`; };
        fn.pitch = function () { log.push('pitch ' + name); return pitchResult; };
        return fn;
      };
      const reg = { a: mk('a'), b: mk('b', 'from-b'), c: mk('c') };
      const out = await runLoaders({ resource: '/r', loaders: ['a', 'b', 'c'], registry: reg, readResource: () => { log.push('read'); return 'src'; } });
      expect(out.result).toBe('a(from-b)');
      expect(log).toEqual(['pitch a', 'pitch b', 'normal a']);
      log.length = 0;
      const first = await runLoaders({ resource: '/r', loaders: ['b', 'c'], registry: reg, readResource: () => 'src' });
      expect(first.result, 'first loader short-circuits: its pitch result is the output').toBe('from-b');
      expect(log).toEqual(['pitch b']);
    },
  },
  {
    group: G3,
    title: 'async pitches: promise and this.async(); undefined continues',
    async run({ runLoaders }, { expect }) {
      const a: Loader = function (src) { return `a(${src})`; };
      a.pitch = async function () { await Promise.resolve(); return undefined; };
      const b: Loader = function (src) { return `b(${src})`; };
      b.pitch = function () { const cb = this.async(); setTimeout(() => cb(null, 'async-pitch'), 0); };
      const c: Loader = function () { throw new Error('c should not run'); };
      const out = await runLoaders({ resource: '/r', loaders: ['a', 'b', 'c'], registry: { a, b, c }, readResource: () => { throw new Error('no read'); } });
      expect(out.result).toBe('a(async-pitch)');
      const bad: Loader = function (s) { return s; };
      bad.pitch = function () { throw new Error('pitch broke'); };
      await expect(runLoaders({ resource: '/r', loaders: ['bad'], registry: { bad }, readResource: () => 's' })).toReject('bad: pitch broke');
    },
  },
  {
    group: G4,
    title: 'this.data is shared between a loader\'s pitch and normal phase, per loader',
    async run({ runLoaders }, { expect }) {
      const mk = (name: string): Loader => {
        const fn: Loader = function (src) { return `${src}+${this.data.mark}`; };
        fn.pitch = function (r, p, data) { data.mark = name; expect(data).toBe(this.data); };
        return fn;
      };
      const out = await runLoaders({ resource: '/r', loaders: ['x', 'y'], registry: { x: mk('x'), y: mk('y') }, readResource: () => 's' });
      expect(out.result).toBe('s+y+x');
      const fresh: Loader = function (s) { return `${s}:${Object.keys(this.data).length}`; };
      const again = await runLoaders({ resource: '/r', loaders: ['fresh'], registry: { fresh }, readResource: () => 's' });
      expect(again.result, 'data starts empty').toBe('s:0');
    },
  },
  {
    group: G4,
    title: 'addDependency collects files after the resource, without duplicates',
    async run({ runLoaders }, { expect }) {
      const imp: Loader = function (src) { this.addDependency('/vars.css'); this.addDependency('/mixins.css'); return src; };
      imp.pitch = function () { this.addDependency('/config.json'); };
      const other: Loader = function (src) { this.addDependency('/vars.css'); this.addDependency(this.resourcePath); return src; };
      const out = await runLoaders({ resource: '/app.css', loaders: ['imp', 'other'], registry: { imp, other }, readResource: () => 'x' });
      expect(out.dependencies).toEqual(['/app.css', '/config.json', '/vars.css', '/mixins.css']);
    },
  },
];
