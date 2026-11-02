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
| `append(path, item)` | Adds an item at the end, creating the array if missing. |
| `remove(path, index)` | Removes one item. |
| `move(path, from, to)` | Moves one item. |
| `ids(path)` | Returns one stable id per item. |

- Out-of-range indices throw a `RangeError`.
- Each item keeps its id when other items are added, removed or moved. New items get new ids.
- Touched state and async errors belong to the **item**, not the index. After `move`, an item's async error and touched state show up at its new index path.
- Removing an item drops its state and cancels its pending checks. A new item never inherits an old item's error.
- Sync and form-level errors are always recomputed from the current values.
- Replacing an array with `setValue` keeps its ids if the length is unchanged. Otherwise it assigns fresh ids.
- Everything from earlier stages still applies.
