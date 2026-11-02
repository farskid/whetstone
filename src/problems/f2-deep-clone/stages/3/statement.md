# Deep clone: edges

Handle the remaining object shapes, add options, and support very deep nesting.

```ts
clone(value, { keepPrototype: true, customizer: (v) => (v instanceof Element ? v : undefined) });
```

```ts
clone<T>(value: T, options?: { keepPrototype?: boolean; customizer?: (value: unknown) => unknown }): T
```

- **Sparse arrays** keep their holes and length. Extra non-index properties on an array are copied too.
- **Symbol keys**: own enumerable symbol-keyed properties are copied. Non-enumerable ones are not. Symbol *values* still throw.
- **Getters** are invoked once, and the result is stored as a plain data property.
- **Class instances** become plain objects with their own enumerable properties, unless `keepPrototype: true` is set, which keeps the prototype. Objects with a `null` prototype keep it.
- `customizer(value)` is called for every object before cloning it. A non-`undefined` result is used as the clone of that object, as-is, and is not traversed.
- **Depth**: nesting 100,000 levels deep (objects or arrays) must work. Recursion will overflow the call stack, so iterate.
- Everything from earlier stages still applies.
