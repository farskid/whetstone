Add the pitch phase, which runs before the resource is read and can skip the rest of the chain.

```ts
styleLoader.pitch = function (remainingRequest) {
  return `inject(require(${JSON.stringify('!!' + remainingRequest)}))`;   // skips css and the read
};

interface Loader {
  (this: LoaderContext, source: unknown): unknown;
  pitch?(this: LoaderContext, remainingRequest: string, precedingRequest: string): unknown;
}
```

1. **Pitch**, left to right: for each loader with a `pitch`, call `pitch(remainingRequest, precedingRequest)`. <!-- tests: pitch runs left to right before the read, with remaining and preceding requests -->
   - `remainingRequest` is the requests after this loader (as written, with their queries) plus the resource, joined with `!`. <!-- tests: pitch runs left to right before the read, with remaining and preceding requests -->
   - `precedingRequest` is the requests before it joined with `!`, or `''`. <!-- tests: pitch runs left to right before the read, with remaining and preceding requests -->
   - A pitch's result follows the stage 2 rules (return, promise or `this.async()`), and so do its errors, named after its loader. `undefined` is fine here: it means continue. <!-- tests: async pitches: promise and this.async(); undefined continues -->
   - If a pitch's result is anything other than `undefined`, stop. Skip the remaining pitches, the resource read, and the normal phase of this loader and every loader to its right. The pitch result becomes the input of the loader to its left, or the final `result` if it is the first loader. <!-- tests: a pitch result short-circuits: only earlier loaders run their normal phase -->
2. **Read**: if nobody short-circuited, `await readResource(resource)` (exactly once).
3. **Normal**, right to left, as in stage 2.

A loader's pitch and normal phase run with the same `this`.
