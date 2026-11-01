import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');
type Plugin = import('./solution').Plugin;

const G1 = 'Dependency order';
const G2 = 'Plugin hooks';
const G3 = 'Cycles and output';
const G4 = 'Virtual modules and chunks';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'modules come dependencies-first, each once, with .js and /index.js resolution',
    async run({ bundle }, { expect }) {
      const files = {
        '/src/main.js': "import { a } from './a';\nimport { b } from './b.js';\nimport { u } from './util';",
        '/src/a.js': "import { c } from './lib/c';\nexport const a = 1;",
        '/src/b.js': "import { c } from './lib/c.js';\nimport { a } from './a';\nexport const b = 2;",
        '/src/lib/c.js': "import '../../shared.js';\nexport const c = 3;",
        '/shared.js': 'globalThis.x = 1;',
        '/src/util/index.js': "import '../a';\nexport const u = 4;",
      };
      const { chunks, cycles } = await bundle({ input: '/src/main.js', files });
      expect(chunks.length).toBe(1);
      expect(chunks[0].modules).toEqual(['/shared.js', '/src/lib/c.js', '/src/a.js', '/src/b.js', '/src/util/index.js', '/src/main.js']);
      expect(cycles).toEqual([]);
    },
  },
  {
    group: G1,
    title: 'resolve failures name the specifier and the importer',
    async run({ bundle }, { expect }) {
      const files = { '/src/main.js': "import './ok';", '/src/ok.js': "import 'lodash';" };
      await expect(bundle({ input: '/src/main.js', files })).toReject('Could not resolve "lodash" from "/src/ok.js"');
      await expect(bundle({ input: '/src/main.js', files: { '/src/main.js': "import { x } from './nope';" } })).toReject('Could not resolve "./nope" from "/src/main.js"');
      await expect(bundle({ input: '/src/missing.js', files })).toReject('Could not resolve entry "/src/missing.js"');
    },
  },
  {
    group: G2,
    title: 'resolveId: plugins in order, first non-null wins, default as fallback',
    async run({ bundle }, { expect }) {
      const calls: string[] = [];
      const alias: Plugin = { name: 'alias', resolveId(s, imp) { calls.push(`alias ${s} ${imp}`); return s.startsWith('@/') ? '/src/' + s.slice(2) + '.js' : null; } };
      const never: Plugin = { name: 'never', resolveId(s) { calls.push('never ' + s); return s === '@/x' ? '/wrong.js' : undefined; } };
      const files = { '/src/main.js': "import '@/x';\nimport './y';", '/src/x.js': '', '/src/y.js': '' };
      const { chunks } = await bundle({ input: '/src/main.js', files, plugins: [alias, never] });
      expect(chunks[0].modules).toEqual(['/src/x.js', '/src/y.js', '/src/main.js']);
      expect(calls).toEqual(['alias /src/main.js undefined', 'never /src/main.js', 'alias @/x /src/main.js', 'alias ./y /src/main.js', 'never ./y']);
    },
  },
  {
    group: G2,
    title: 'load: first non-null wins; transform chains in order and imports are scanned after it',
    async run({ bundle }, { expect }) {
      const files = { '/m.js': 'MAIN', '/added.js': 'ADDED', '/raw.txt': 'hello' };
      const seen: string[] = [];
      const txt: Plugin = { name: 'txt', load: (id) => (id.endsWith('.txt') ? `export default ${JSON.stringify(files[id as '/raw.txt'])};` : null) };
      const one: Plugin = { name: 'one', transform: (code, id) => { seen.push('one ' + id); return id === '/m.js' ? code + "\nimport './added';\nimport './raw.txt';" : null; } };
      const two: Plugin = { name: 'two', transform: async (code) => code.replace('MAIN', 'main()') };
      const { chunks } = await bundle({ input: '/m.js', files, plugins: [txt, one, two] });
      expect(chunks[0].modules).toEqual(['/added.js', '/raw.txt', '/m.js']);
      expect(chunks[0].code).toContain("main()\nimport './added';");
      expect(chunks[0].code).toContain('export default "hello";');
      expect(seen).toEqual(['one /m.js', 'one /added.js', 'one /raw.txt']);
      await expect(bundle({ input: '/m.js', files: { '/m.js': "import './gone';", '/gone.js': 'x' }, plugins: [{ name: 'eat', load: (id) => { if (id === '/gone.js') throw new Error('Could not load "/gone.js"'); return null; } }] })).toReject('Could not load "/gone.js"');
    },
  },
  {
    group: G2,
    title: 'each module is loaded and transformed once, however often it is imported',
    async run({ bundle }, { expect }) {
      const loads: string[] = [];
      const files = { '/m.js': "import './c';\nimport './c.js';\nimport './d';", '/d.js': "import './c';", '/c.js': 'C' };
      const count: Plugin = { name: 'count', load: (id) => { loads.push(id); return null; } };
      const { chunks } = await bundle({ input: '/m.js', files, plugins: [count] });
      expect(loads).toEqual(['/m.js', '/c.js', '/d.js']);
      expect(chunks[0].modules).toEqual(['/c.js', '/d.js', '/m.js']);
      expect(chunks[0].code.split('define("/c.js"').length - 1).toBe(1);
    },
  },
  {
    group: G3,
    title: 'circular imports are allowed and reported',
    async run({ bundle }, { expect }) {
      const files = {
        '/main.js': "import './a';\nimport './self';",
        '/a.js': "import './b';",
        '/b.js': "import './c';\nimport './a';",
        '/c.js': "import './b';",
        '/self.js': "import './self';",
      };
      const { chunks, cycles } = await bundle({ input: '/main.js', files });
      expect(chunks[0].modules).toEqual(['/c.js', '/b.js', '/a.js', '/self.js', '/main.js']);
      expect(cycles).toEqual([['/b.js', '/c.js', '/b.js'], ['/a.js', '/b.js', '/a.js'], ['/self.js', '/self.js']]);
    },
  },
  {
    group: G3,
    title: 'output wraps each module in define() and requires the entry',
    async run({ bundle }, { expect }) {
      const files = { '/src/main.js': "import { add } from './math';\nconsole.log(add(1, 2));", '/src/math.js': 'export const add = (a, b) => a + b;' };
      const { chunks } = await bundle({ input: '/src/main.js', files });
      expect(chunks[0]).toEqual({
        name: 'main', entry: '/src/main.js', isEntry: true, modules: ['/src/math.js', '/src/main.js'], requires: [],
        code:
          'define("/src/math.js", function (module, exports, require) {\nexport const add = (a, b) => a + b;\n});\n' +
          'define("/src/main.js", function (module, exports, require) {\nimport { add } from \'./math\';\nconsole.log(add(1, 2));\n});\n' +
          'require("/src/main.js");\n',
      });
    },
  },
  {
    group: G4,
    title: 'virtual modules come from plugins and are never read from files',
    async run({ bundle }, { expect }) {
      const virtual: Plugin = {
        name: 'virtual',
        resolveId: (s) => (s.startsWith('virtual:') ? '\0' + s : null),
        load: (id) => (id === '\0virtual:config' ? 'export default { debug: true };' : null),
      };
      const files = { '/main.js': "import cfg from 'virtual:config';", '\0virtual:other': 'should not be read' };
      const { chunks } = await bundle({ input: '/main.js', files, plugins: [virtual] });
      expect(chunks[0].modules).toEqual(['\0virtual:config', '/main.js']);
      expect(chunks[0].code).toContain('define("\\u0000virtual:config", function (module, exports, require) {\nexport default { debug: true };\n});');
      await expect(bundle({ input: '/main.js', files: { ...files, '/main.js': "import 'virtual:other';" }, plugins: [virtual] })).toReject('Could not load "\0virtual:other"');
    },
  },
  {
    group: G4,
    title: 'dynamic import() creates a separate chunk without modules main already has',
    async run({ bundle }, { expect }) {
      const files = {
        '/src/main.js': "import './shared';\nbutton.onclick = () => import('./pages/about.js');",
        '/src/shared.js': 'export const s = 1;',
        '/src/pages/about.js': "import '../shared';\nimport './about-widget';",
        '/src/pages/about-widget.js': 'W',
      };
      const { chunks } = await bundle({ input: '/src/main.js', files });
      expect(chunks.map((c) => [c.name, c.isEntry, c.modules])).toEqual([
        ['main', true, ['/src/shared.js', '/src/main.js']],
        ['about', false, ['/src/pages/about-widget.js', '/src/pages/about.js']],
      ]);
      expect(chunks[1].entry).toBe('/src/pages/about.js');
      expect(chunks[1].code.includes('require('), 'only the main chunk requires its entry').toBe(false);
      expect(chunks[1].code.endsWith('});\n')).toBe(true);
    },
  },
  {
    group: G4,
    title: 'chunk order follows discovery; names are unique and sanitized',
    async run({ bundle }, { expect }) {
      const virtual: Plugin = { name: 'v', resolveId: (s) => (s === 'virtual:x' ? '\0virtual:x' : s.startsWith('/') ? s : null), load: (id) => (id === '\0virtual:x' ? "import('/lib/a.js');" : null) };
      const files = {
        '/main.js': "import './dep';\nimport('./b');\nimport('./a');",
        '/dep.js': "import('virtual:x');",
        '/a.js': "import('./b');",
        '/b.js': '',
        '/lib/a.js': '',
      };
      const { chunks } = await bundle({ input: '/main.js', files, plugins: [virtual] });
      expect(chunks.map((c) => `${c.name}:${c.entry}`)).toEqual(['main:/main.js', 'virtual_x:\0virtual:x', 'b:/b.js', 'a:/a.js', 'a2:/lib/a.js']);
    },
  },
  {
    group: G4,
    title: 'shared modules: earlier chunks own them; requires lists non-main owners',
    async run({ bundle }, { expect }) {
      const files = {
        '/main.js': "import './core';\nimport('./x');\nimport('./y');\nimport('./core');\nimport('./z');",
        '/core.js': '',
        '/x.js': "import './core';",
        '/y.js': "import './x';\nimport './y-only';",
        '/y-only.js': '',
        '/z.js': "import './w';",
        '/w.js': "import './y';",
      };
      const { chunks } = await bundle({ input: '/main.js', files });
      expect(chunks.map((c) => [c.name, c.modules, c.requires])).toEqual([
        ['main', ['/core.js', '/main.js'], []],
        ['x', ['/x.js'], []],
        ['y', ['/y-only.js', '/y.js'], ['x']],
        ['z', ['/w.js', '/z.js'], ['y']],
      ]);
      const skip = await bundle({ input: '/main.js', files: { '/main.js': "import('./y');\nimport('./x');", '/y.js': "import './x';", '/x.js': '' } });
      expect(skip.chunks.map((c) => [c.name, c.modules])).toEqual([['main', ['/main.js']], ['y', ['/x.js', '/y.js']]]);
    },
  },
];
