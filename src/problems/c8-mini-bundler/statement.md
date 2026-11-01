# Mini bundler with plugins

Rollup takes an entry module, follows its imports, lets plugins resolve, load and transform each module, and writes chunks. Build a small version over an in-memory file system.

```ts
const { chunks, cycles } = await bundle({
  input: '/src/main.js',
  files: { '/src/main.js': "import { add } from './math';\nconsole.log(add(1, 2));", '/src/math.js': 'export const add = (a, b) => a + b;' },
  plugins: [],
});
chunks[0].modules; // ['/src/math.js', '/src/main.js']
```

## API

```ts
interface Plugin {
  name: string;
  resolveId?(source: string, importer: string | undefined): string | null | undefined | Promise<…>;
  load?(id: string): string | null | undefined | Promise<…>;
  transform?(code: string, id: string): string | null | undefined | Promise<…>;
}
interface Chunk {
  name: string; entry: string; isEntry: boolean;
  modules: string[];    // dependencies first
  requires: string[];   // names of other non-entry chunks this chunk needs
  code: string;
}
function bundle(opts: { input: string; files: Record<string, string>; plugins?: Plugin[] }):
  Promise<{ chunks: Chunk[]; cycles: string[][] }>;
function scanImports(code: string): { static: string[]; dynamic: string[] }; // provided in the starter
```

`scanImports` is already written. It returns the specifiers of `import … from 'x'`, `import 'x'` and `export … from 'x'` (static), and of `import('x')` (dynamic), in source order.

## Rules

**Resolving** `(source, importer)`. The entry is resolved with `importer` undefined.
1. Ask each plugin's `resolveId` in order. The first result that isn't `null`/`undefined` is the id.
2. Otherwise resolve it yourself:
   - Entry: `source` itself.
   - Imports starting with `./` or `../`: join with the importer's directory (POSIX, `..` above `/` stays at `/`).
   - Try the path as is, then with `.js`, then with `/index.js`, and take the first one present in `files`.
   - Bare specifiers and imports from ids starting with `\0` are not resolved by default.
3. Failure throws `Could not resolve "<source>" from "<importer>"`, or `Could not resolve entry "<source>"` for the entry.

**Loading**
- Ask each plugin's `load` in order; the first non-null result wins.
- Otherwise use `files[id]`. Ids starting with `\0` are virtual and never read from `files`.
- Failure throws `Could not load "<id>"`.
- Then run every plugin's `transform` in order. Each one gets the previous code, and a null result keeps it.
- Imports are scanned from the **transformed** code.
- Each module id is loaded, transformed and scanned once, however many times it's imported.

**Graph walk**
- Load the entry, then its static imports, then its dynamic imports, recursively in that order.
- Duplicate specifiers that resolve to the same id count once.

**Chunks**
- Chunk 0 is the entry chunk, named `main`.
- Its `modules` list comes from a depth-first walk over **static** imports in source order. A module is added after its dependencies (post-order).
- **Cycles:** reaching a module that is still on the walk stack doesn't recurse. Record the cycle as the stack slice from that module to the current one, plus that module again, e.g. `['/a.js', '/b.js', '/a.js']`. `cycles` lists them in the order found.
- **Dynamic imports** whose target isn't in an existing chunk queue a new chunk. Targets are queued in the order they appear: walk the chunk's modules in order, and within each module its dynamic imports in order. Chunks are then built in queue order.
- A queued target that already belongs to a chunk by the time its turn comes produces no chunk.
- A non-entry chunk's walk stops at modules owned by an earlier chunk.
  - If the owner is `main`, nothing is recorded; main is always loaded.
  - Otherwise the owner's name goes in `requires`, in chunk order and without duplicates.
- **Names:**
  - Take the entry id without a leading `\0`.
  - Keep the last path segment and drop its extension.
  - Replace characters outside `[A-Za-z0-9_-]` with `_`.
  - If the name is taken, append 2, 3, …
  - Example: `/src/pages/about.js` → `about`; `\0virtual:x` → `virtual_x`.

**Code**
- For each module in order:

  ```
  define("<id>", function (module, exports, require) {
  <transformed code>
  });
  ```

  The ids are JSON-quoted. Entries are joined with `\n`.
- The main chunk then adds `\nrequire("<entry id>");`.
- Every chunk's code ends with `\n`.
