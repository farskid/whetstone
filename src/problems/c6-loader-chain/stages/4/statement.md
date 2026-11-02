Add per-loader data and dependency tracking.

```ts
interface LoaderContext {
  // ...stage 3, plus:
  data: Record<string, unknown>;      // shared by this loader's pitch and normal phase
  addDependency(file: string): void;
}
// pitch(remainingRequest, precedingRequest, data)
// runLoaders resolves to { result, dependencies: string[] }
```

- Each loader in the chain has one context, and `this.data` starts as `{}` for each run. A pitch also gets that same object as its third argument, so data set in `pitch` is visible in the normal phase. Different loaders have separate `data`.
- `dependencies` starts with the resource. `addDependency(file)`, from a pitch or a normal phase, appends files in call order, without duplicates (adding the resource again does nothing).
