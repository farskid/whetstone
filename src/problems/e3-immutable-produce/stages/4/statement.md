Add **patches**: `produceWithPatches` describes a change, and `applyPatches` replays one.

```ts
const [next, patches, inverse] = produceWithPatches({ a: 1 }, (d) => { d.a = 2; });
patches;                    // [{ op: 'replace', path: ['a'], value: 2 }]
inverse;                    // [{ op: 'replace', path: ['a'], value: 1 }]
applyPatches(next, inverse);   // { a: 1 }
```

```ts
type PatchPath = (string | number)[];
interface Patch { op: 'add' | 'remove' | 'replace'; path: PatchPath; value?: unknown }

function produceWithPatches<T>(base: T, recipe: Recipe<T>): [T, Patch[], Patch[]];
function applyPatches<T>(base: T, patches: Patch[]): T;
```

`produceWithPatches` returns `[result, patches, inversePatches]`. `path` is an array of keys; array indices are numbers. An unchanged result has no patches. <!-- tests: patches and inverse patches for objects and arrays -->

Generate them per modified level, recursing into child drafts that changed. Patches go in this order:

- **Objects:** first the base's keys in order: `remove` if the key is gone, otherwise `replace` (or recurse) if the value changed. Then `add` for new keys. <!-- tests: patches and inverse patches for objects and arrays -->
- **Arrays:** each common index: `replace` or recurse. Then `add` new indices in ascending order, or `remove` dropped indices from the end (descending). <!-- tests: patches and inverse patches for objects and arrays -->
- **Maps:** like objects, keyed by the Map key. <!-- tests: applyPatches round-trips, including Maps, Sets and root replacement -->
- **Sets:** a changed Set is one `replace` of the whole Set. <!-- tests: applyPatches round-trips, including Maps, Sets and root replacement -->
- **Root:** a replaced root (a returned value) is `{ op: 'replace', path: [] }`. <!-- tests: applyPatches round-trips, including Maps, Sets and root replacement -->
- **Inverse patches** undo the change when applied in order. <!-- tests: applyPatches round-trips, including Maps, Sets and root replacement -->

`applyPatches(base, patches)` applies patches immutably (through `produce`): <!-- tests: applyPatches round-trips, including Maps, Sets and root replacement -->
- `add` on an array index inserts; `remove` on an array index splices;
- on objects and Maps, `add` and `replace` set and `remove` deletes;
- `path: []` replaces the root. No patches returns `base`.
