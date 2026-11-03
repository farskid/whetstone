# Deep diff & patch: diff

Add `diff(a, b)`. It returns [JSON Patch](https://www.rfc-editor.org/rfc/rfc6902) operations that turn `a` into `b` when applied in order.

```ts
diff({ keep: 1, gone: true, n: { y: 2 } }, { added: [1], n: { y: 3 }, keep: 1 });
// [{ op: 'remove', path: '/gone' },
//  { op: 'add', path: '/added', value: [1] },
//  { op: 'replace', path: '/n/y', value: 3 }]
```

```ts
type Operation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown };

diff(a: unknown, b: unknown): Operation[]
```

**Paths** are JSON Pointers: `/` followed by tokens joined with `/`. In key tokens, `~` is escaped as `~0` and `/` as `~1`. The root path is `''`, and the empty key is `/`. <!-- tests: pointer escaping, root replace and kind changes -->

**Equal values** (by `isEqual`) produce `[]`.

**Objects**
- Keys only in `a` are `remove`d first, in `a`'s key order. <!-- tests: objects: removes first, then adds and nested changes in b order -->
- Then, for keys in `b`'s order: a new key is `add`ed; a shared key is diffed recursively. <!-- tests: objects: removes first, then adds and nested changes in b order -->

**Arrays** (matched by index)
- Shared indices are diffed recursively.
- Extra trailing items are `remove`d from the end backwards. <!-- tests: arrays by index: trailing removes go backwards, adds go forwards; values are copies -->
- New trailing items are `add`ed in ascending index order. <!-- tests: arrays by index: trailing removes go backwards, adds go forwards; values are copies -->

**Anything else that differs** becomes a single `replace` at that path. That includes changing kind (array ↔ object, primitive ↔ container), a key becoming `undefined`, or a whole root: `diff(1, [1])` → `[{ op: 'replace', path: '', value: [1] }]`. <!-- tests: pointer escaping, root replace and kind changes -->

**`value`s in ops** are deep copies, so mutating `b` later doesn't change the patch. <!-- tests: arrays by index: trailing removes go backwards, adds go forwards; values are copies -->
