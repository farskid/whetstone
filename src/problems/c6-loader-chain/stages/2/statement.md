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
- Each entry in `loaders` is now a request: a name plus an optional query. `parseLoader('css?modules=1&x=a')` gives `{ name: 'css', options: { modules: '1', x: 'a' } }`. Values stay strings, decoded like a URL query.
- A query starting with `{` is JSON: `'css?{"modules":true}'`.
- No `?` means empty options. The loader sees its own options as `this.options`.

**A loader's result** is one of:
- the value it returns;
- what a returned promise resolves to;
- if it called `this.async()`, whatever it passes to the callback. Its return value is then ignored.

A result of `undefined` rejects with `` `${name}: did not return a result` ``.

**Errors**
- Calling the async callback a second time throws (synchronously, at the second call). The first result stands.
- A throw, a rejection, or `callback(err)` rejects `runLoaders` with an `Error` whose message is `` `${name}: ${original message}` `` (or `String(err)` for a non-`Error`) and whose `cause` is the original error. Later loaders don't run.
