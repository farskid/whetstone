# Form state manager: field arrays

Add array helpers with stable item ids.

```ts
const form = createForm({ initialValues: { list: ['a', 'b', 'c'] } });
const [ia, ib, ic] = form.ids('list');
form.move('list', 2, 0);
form.values.list; // ['c', 'a', 'b']
form.ids('list'); // [ic, ia, ib]
```

| Method | Effect |
| --- | --- |
| `append(path, item)` | Adds an item at the end, creating the array if missing. <!-- tests: append, remove and move update values and stable ids --> |
| `remove(path, index)` | Removes one item. <!-- tests: append, remove and move update values and stable ids --> |
| `move(path, from, to)` | Moves one item. <!-- tests: append, remove and move update values and stable ids --> |
| `ids(path)` | Returns one stable id per item. <!-- tests: append, remove and move update values and stable ids --> |

- Out-of-range indices throw a `RangeError`.
- Each item keeps its id when other items are added, removed or moved. New items get new ids. <!-- tests: append, remove and move update values and stable ids -->
- Touched state and async errors belong to the **item**, not the index. After `move`, an item's async error and touched state show up at its new index path. <!-- tests: touched and async errors follow their item -->
- Removing an item drops its state and cancels its pending checks. A new item never inherits an old item's error. <!-- tests: removing an item cancels its pending check -->
- Sync and form-level errors are always recomputed from the current values.
- Replacing an array with `setValue` keeps its ids if the length is unchanged. Otherwise it assigns fresh ids. <!-- tests: replacing an array keeps ids only when the length matches -->
- Everything from earlier stages still applies.
