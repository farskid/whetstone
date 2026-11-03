# Deep clone: built-ins and identity

Copy built-in types, and keep the shape of cycles and shared references.

```ts
const a: any = { when: new Date(0), tags: new Set(['x']) };
a.self = a;
const b = clone(a);
b.self === b;      // true
b.when !== a.when; // true
```

| Type | How it's copied |
| --- | --- |
| `Date` | Same time. <!-- tests: Date and RegExp (with lastIndex) --> |
| `RegExp` | Same source and flags, **and** the same `lastIndex`. <!-- tests: Date and RegExp (with lastIndex) --> |
| `Map` | Same insertion order. Keys and values that are objects are cloned too. <!-- tests: Map and Set keep order and clone object keys and members --> |
| `Set` | Same insertion order. Object members are cloned. <!-- tests: Map and Set keep order and clone object keys and members --> |
| `ArrayBuffer` | Copied. |
| Typed arrays and `DataView` | Copied with the same type, offset and length. Views that share a buffer in the input share one cloned buffer in the output. <!-- tests: typed arrays and DataView share one cloned buffer --> |

**Identity**
- Each input object is cloned exactly once.
- If the same object appears twice (anywhere: properties, array items, Map keys or values, Set members), both places point at the same clone, and cycles map to cycles. <!-- tests: cycles and shared references keep their shape -->
- Function and symbol values still throw, including inside Maps and Sets.
- Nesting stays shallow enough for recursion in this stage.
