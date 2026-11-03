Add plugins that can resolve, load and transform modules.

```ts
const alias = { name: 'alias', resolveId: (s) => (s.startsWith('@/') ? '/src/' + s.slice(2) + '.js' : null) };
await bundle({ input: '/src/main.js', files, plugins: [alias] });

interface Plugin {
  name: string;
  resolveId?(source: string, importer: string | undefined): string | null | undefined | Promise<…>;
  load?(id: string): string | null | undefined | Promise<…>;
  transform?(code: string, id: string): string | null | undefined | Promise<…>;
}
// options, plus: plugins?: Plugin[]
```

Every hook may return its answer directly or as a promise, and `null` or `undefined` means "no answer".

**Resolving**: ask each plugin's `resolveId(source, importer)` in order. The entry is asked with `importer` undefined. The first answer is the id, and later plugins aren't asked. With no answer, fall back to the stage 1 rules. <!-- tests: resolveId: plugins in order, first non-null wins, default as fallback -->

**Loading**: ask each plugin's `load(id)` in order, and the first answer is the code. Otherwise use `files[id]` as before. A throw from a hook rejects `bundle` with that error. <!-- tests: load: first non-null wins; transform chains in order and imports are scanned after it -->

**Transforming**: after loading, run every plugin's `transform(code, id)` in order. Each one gets the previous code, and no answer keeps it. Imports are scanned from the **transformed** code. <!-- tests: load: first non-null wins; transform chains in order and imports are scanned after it -->

**Order of hook calls**: for each module, load and transform it, then resolve all of its static imports in source order, then visit the resolved dependencies in that order (depth first). A module that was already visited is skipped, so each id is loaded and transformed once. <!-- tests: each module is loaded and transformed once, however often it is imported -->
