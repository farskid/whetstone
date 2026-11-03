# Deep clone: edges

Handle the remaining object shapes, add options, and support very deep nesting.

```ts
clone(value, { keepPrototype: true, customizer: (v) => (v instanceof Element ? v : undefined) });
```

```ts
clone<T>(value: T, options?: { keepPrototype?: boolean; customizer?: (value: unknown) => unknown }): T
```

- **Sparse arrays** keep their holes and length. Extra non-index properties on an array are copied too. <!-- tests: sparse arrays keep holes; extra array props are copied -->
- **Symbol keys**: own enumerable symbol-keyed properties are copied. Non-enumerable ones are not. Symbol *values* still throw. <!-- tests: symbol keys are copied; non-enumerable ones are not -->
- **Getters** are invoked once, and the result is stored as a plain data property. <!-- tests: getters become data; class instances become plain unless keepPrototype -->
- **Class instances** become plain objects with their own enumerable properties, unless `keepPrototype: true` is set, which keeps the prototype. Objects with a `null` prototype keep it. <!-- tests: getters become data; class instances become plain unless keepPrototype -->
- `customizer(value)` is called for every object before cloning it. A non-`undefined` result is used as the clone of that object, as-is, and is not traversed. <!-- tests: customizer replaces objects without traversing them -->
- **Depth**: nesting 100,000 levels deep (objects or arrays) must work. Recursion will overflow the call stack, so iterate. <!-- tests: 100,000 levels deep (objects and arrays) without stack overflow -->
- Everything from earlier stages still applies.
