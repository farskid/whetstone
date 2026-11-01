# Deep clone

Implement `clone(value, options?)`. It returns a deep copy that shares no mutable object with the input.

```ts
const a: any = { when: new Date(0), tags: new Set(['x']) };
a.self = a;
const b = clone(a);
b.self === b;      // true
b.when !== a.when; // true
```

## Values
- **Primitives** (including `undefined`, `NaN`, `-0` and bigint) are returned as-is.
- **Function or symbol values** anywhere in the graph throw a `TypeError`. Symbol *keys* are fine.
- **Plain objects and arrays** are copied, including own enumerable symbol-keyed properties.
- **Sparse arrays** keep their holes and length. Extra non-index properties on an array are copied too.
- **Getters** are invoked once, and the result is stored as a plain data property.
- **Class instances** become plain objects with their own enumerable properties, unless `keepPrototype: true` is set, which keeps the prototype. Objects with a `null` prototype keep it.

## Built-ins

| Type | How it's copied |
| --- | --- |
| `Date` | Same time. |
| `RegExp` | Same source and flags, **and** the same `lastIndex`. |
| `Map` | Same insertion order. Keys that are objects are cloned too. |
| `Set` | Same insertion order. |
| `ArrayBuffer` | Copied. |
| Typed arrays and `DataView` | Copied with the same type, offset and length. Views that share a buffer in the input share one cloned buffer in the output. |

## Identity
- Each input object is cloned exactly once.
- If the same object appears twice, both places point at the same clone, and cycles map to cycles.

## Options
- `customizer(value)` is called for every object before cloning it. A non-`undefined` result is used as the clone of that object, as-is, and is not traversed.
- `keepPrototype`: see above.

## Depth
Nesting 100,000 levels deep must work. Recursion will overflow the call stack, so iterate.
