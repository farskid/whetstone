webpack turns a request like `style!css!./app.css` into a chain of loaders. Rebuild the part of `loader-runner` that executes that chain. Start with plain synchronous loaders.

```ts
const { result } = await runLoaders({
  resource: './app.css',
  loaders: ['style', 'css'],
  registry: { style: styleLoader, css: cssLoader },
  readResource: (path) => fs.readFile(path, 'utf8'),
});
// result = styleLoader(cssLoader(contents of ./app.css))
```

```ts
interface LoaderContext { resourcePath: string }
interface Loader { (this: LoaderContext, source: unknown): unknown }

function runLoaders(opts: {
  resource: string;
  loaders: string[];                    // loader names, left to right as written
  registry: Record<string, Loader>;
  readResource(path: string): unknown;  // value or promise
}): Promise<{ result: unknown }>;
```

- Look every name up in `registry` first. An unknown name makes `runLoaders` reject (the message names the loader), and nothing is read. <!-- tests: unknown loaders and read errors reject -->
- Then `await readResource(resource)`, exactly once. If it throws or rejects, `runLoaders` rejects with that error. <!-- tests: unknown loaders and read errors reject -->
- Then run the loaders **right to left**: the last loader gets the resource contents, and each loader gets the previous loader's return value. Each runs with `this.resourcePath` set to the resource. <!-- tests: loaders apply right to left to the resource -->
- `result` is the first loader's return value, or the resource contents if there are no loaders. <!-- tests: loaders apply right to left to the resource -->
- In this stage loaders are synchronous. A throw rejects `runLoaders` with that error.
