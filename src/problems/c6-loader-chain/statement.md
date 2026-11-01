# Loader chain with pitching

webpack turns a request like `style!css?modules=1!./app.css` into a chain of loaders. Rebuild the part of `loader-runner` that executes that chain.

```ts
const { result, dependencies } = await runLoaders({
  resource: './app.css',
  loaders: ['style', 'css?modules=1'],
  registry: { style: styleLoader, css: cssLoader },
  readResource: (path) => fs.readFile(path, 'utf8'),
});
```

## API

```ts
interface LoaderContext {
  resourcePath: string;
  options: Record<string, unknown>;   // from the loader's query
  data: Record<string, unknown>;      // shared by this loader's pitch and normal phase
  async(): (err?: unknown, result?: unknown) => void;
  addDependency(file: string): void;
}
interface Loader {
  (this: LoaderContext, source: unknown): unknown;
  pitch?(this: LoaderContext, remainingRequest: string, precedingRequest: string, data: Record<string, unknown>): unknown;
}

function parseLoader(request: string): { name: string; options: Record<string, unknown> };
function runLoaders(opts: {
  resource: string;
  loaders: string[];                    // left to right as written
  registry: Record<string, Loader>;
  readResource(path: string): unknown;  // value or promise
}): Promise<{ result: unknown; dependencies: string[] }>;
```

## Rules

**Options**
- `parseLoader('css?modules=1&x=a')` gives `{ name: 'css', options: { modules: '1', x: 'a' } }`. Values stay strings, decoded like a URL query.
- A query starting with `{` is JSON: `'css?{"modules":true}'`.
- No `?` means empty options.
- An unknown loader name makes `runLoaders` reject.

**Running a loader function** (pitch or normal)
- The function runs with its `LoaderContext` as `this`. Its result is one of:
  - the value it returns;
  - what a returned promise resolves to;
  - if it called `this.async()`, whatever it passes to the callback. Its return value is then ignored.
- Calling the async callback a second time throws (synchronously, at the second call). The first result stands.
- A throw, a rejection, or `callback(err)` rejects `runLoaders` with an `Error` whose message is `` `${name}: ${original message}` `` and whose `cause` is the original error.

**Phases**
1. **Pitch**, left to right: for each loader with a `pitch`, call `pitch(remainingRequest, precedingRequest, this.data)`.
   - `remainingRequest` is the requests after this loader plus the resource, joined with `!`.
   - `precedingRequest` is the requests before it joined with `!`, or `''`.
   - If a pitch's result is anything other than `undefined`, stop. Skip the remaining pitches, the resource read, and the normal phase of this loader and every loader to its right. The pitch result becomes the input of the loader to its left.
2. **Read**: if nobody short-circuited, `await readResource(resource)` (exactly once).
3. **Normal**, right to left: each loader gets the previous result. A normal phase whose result is `undefined` rejects with `` `${name}: did not return a result` ``.

The final value is `result`.

**Context**
- Each loader in the chain has one context, shared by its pitch and its normal phase. So `this.data` set in `pitch` is visible in the normal phase.
- `dependencies` starts with the resource. `addDependency(file)` appends files in call order, without duplicates.
