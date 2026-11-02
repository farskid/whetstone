# Deep clone

Implement `clone(value)`. It returns a deep copy that shares no object with the input. This stage covers plain data.

```ts
const a = { n: 1, list: [1, { d: 'x' }], none: undefined };
const b = clone(a);
b.list[1] !== a.list[1]; // true
'none' in b;             // true
```

```ts
clone<T>(value: T): T
```

- **Primitives** (including `undefined`, `null`, `NaN`, `-0` and bigint) are returned as-is.
- **Plain objects and arrays** are copied recursively: every nested object and array in the result is new. Keys whose value is `undefined` are kept.
- **Function or symbol values** anywhere (including `value` itself) throw a `TypeError`.
- In this stage, inputs contain only primitives, plain objects and dense arrays, with no cycles or shared objects.
