Rollup takes an entry module, follows its imports, and writes chunks. Build a small version over an in-memory file system. Start with resolving imports and ordering the modules.

```ts
const { chunks } = await bundle({
  input: '/src/main.js',
  files: { '/src/main.js': "import { add } from './math';\nconsole.log(add(1, 2));", '/src/math.js': 'export const add = (a, b) => a + b;' },
});
chunks[0].modules; // ['/src/math.js', '/src/main.js']
```

```ts
interface Chunk { name: string; entry: string; isEntry: boolean; modules: string[] }
function bundle(opts: { input: string; files: Record<string, string> }):
  Promise<{ chunks: Chunk[]; cycles: string[][] }>;
interface ScannedImports { static: string[]; dynamic: string[] }
function scanImports(code: string): ScannedImports; // provided in the starter
```

`scanImports` is already written. It returns the specifiers of `import … from 'x'`, `import 'x'` and `export … from 'x'` (static), and of `import('x')` (dynamic), in source order. In this stage, use only the static ones and ignore dynamic imports.

**Resolving** `(source, importer)`:
- The entry (`input`) has no importer. Try it as is, then with `.js`, then with `/index.js`, and take the first one present in `files`. <!-- tests: modules come dependencies-first, each once, with .js and /index.js resolution -->
- Imports starting with `./` or `../` are joined with the importer's directory (POSIX, `..` above `/` stays at `/`), then tried the same three ways. <!-- tests: modules come dependencies-first, each once, with .js and /index.js resolution -->
- Bare specifiers (`'lodash'`) are not resolved.
- A failure throws `Could not resolve "<source>" from "<importer>"`, or `Could not resolve entry "<source>"` for the entry. <!-- tests: resolve failures name the specifier and the importer -->

**Loading**
- A module's code is `files[id]`. A missing id throws `Could not load "<id>"`.
- Each module id is loaded and scanned once, however many times it's imported. Duplicate specifiers that resolve to the same id count once. <!-- tests: modules come dependencies-first, each once, with .js and /index.js resolution -->

**Result**
- `chunks` has one chunk: `{ name: 'main', entry: <entry id>, isEntry: true, modules }`.
- `modules` comes from a depth-first walk over static imports in source order. A module is added after its dependencies (post-order), and each module appears once. <!-- tests: modules come dependencies-first, each once, with .js and /index.js resolution -->
- In this stage imports are never circular, and `cycles` is always `[]`.
