Add loader options, async loaders, and errors that say which loader failed.

```ts
loaders: ['style', 'css?modules=1'],

interface LoaderContext {
  // ...stage 1, plus:
  options: Record<string, unknown>;
  async(): (err?: unknown, result?: unknown) => void;
}
function parseLoader(request: string): { name: string; options: Record<string, unknown> };
```

**Options**
- Each entry in `loaders` is now a request: a name plus an optional query. `parseLoader('css?modules=1&x=a')` gives `{ name: 'css', options: { modules: '1', x: 'a' } }`. Values stay strings, decoded like a URL query. <!-- tests: options come from the loader query string or JSON -->
- A query starting with `{` is JSON: `'css?{"modules":true}'`. <!-- tests: options come from the loader query string or JSON -->
- No `?` means empty options. The loader sees its own options as `this.options`. <!-- tests: options come from the loader query string or JSON -->

**A loader's result** is one of:
- the value it returns;
- what a returned promise resolves to; <!-- tests: async loaders: this.async() callback and returned promises -->
- if it called `this.async()`, whatever it passes to the callback. Its return value is then ignored. <!-- tests: async loaders: this.async() callback and returned promises -->

A result of `undefined` rejects with `` `${name}: did not return a result` ``. <!-- tests: calling the async callback twice throws; undefined results reject -->

**Errors**
- Calling the async callback a second time throws (synchronously, at the second call). The first result stands. <!-- tests: calling the async callback twice throws; undefined results reject -->
- A throw, a rejection, or `callback(err)` rejects `runLoaders` with an `Error` whose message is `` `${name}: ${original message}` `` (or `String(err)` for a non-`Error`) and whose `cause` is the original error. Later loaders don't run. <!-- tests: errors carry the loader name and the original cause -->
