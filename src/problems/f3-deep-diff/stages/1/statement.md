# Deep diff & patch

You'll build `isEqual`, `diff` and `applyPatch` for JSON-like values: plain objects, arrays, primitives and `Date`s. This stage is `isEqual`.

```ts
isEqual({ a: 1, b: [NaN] }, { b: [NaN], a: 1 }); // true
isEqual({ a: undefined }, {});                   // false
```

```ts
isEqual(a: unknown, b: unknown): boolean
```

- Primitives compare with SameValueZero, so `NaN` equals `NaN` and `0` equals `-0`. No type coercion: `'1'` is not `1`, and `null` is not `undefined`. <!-- tests: isEqual: SameValueZero, Dates, key order -->
- `Date`s compare by time. <!-- tests: isEqual: SameValueZero, Dates, key order -->
- Arrays compare length, then element by element.
- Objects compare by their own enumerable keys. Key order doesn't matter, but a key set to `undefined` is **not** the same as a missing key. <!-- tests: isEqual: SameValueZero, Dates, key order | isEqual: undefined differs from missing; arrays differ from objects -->
- Values of different kinds are never equal. An array is never equal to an object (even an array-like one), and a `Date` is never equal to a number. <!-- tests: isEqual: undefined differs from missing; arrays differ from objects -->
