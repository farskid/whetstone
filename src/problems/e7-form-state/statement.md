# Form state manager

Build the state layer of a form library: values, dirty and touched tracking, validation and field arrays. There is no UI, only state.

```ts
const form = createForm({
  initialValues: { email: '', items: [{ name: 'a' }] },
  fields: {
    email: { validate: (v) => (v.includes('@') ? undefined : 'Invalid email'),
             asyncValidate: checkTaken, debounceMs: 300 },
    'items.*.name': { validate: (v) => (v ? undefined : 'Required') },
  },
  clock,
});
form.setValue('email', 'me@x.io');
await form.submit(save);
```

## Paths and values

- Paths are dot strings, and array indices are numbers: `'items.0.name'`.
- `values` is replaced immutably on every change. Containers that didn't change keep their identity.
- `getValue(path)` reads a value. `setValue(path, value)` writes one, creating missing objects, or arrays for numeric segments.
- `isDirty(path?)` deep-compares the current value with the initial value, for the path or the whole form.
- `touch(path)` and `isTouched(path)` track which fields the user has visited.
- `reset(values?)` restores the initial values, optionally setting new ones. It also clears touched state and async results, and cancels pending checks.

## Validation

`errors` is an object keyed by **index path**. Only paths with an error appear.

Field config is keyed by patterns, where `*` matches exactly one segment.

Each path's error is the first that applies, in this order:
1. The field's sync `validate(value, values)`.
2. The field's latest async result.
3. The form-level `validate(values)`, which returns an `{ path: message }` object.

`isValid` means `errors` is empty.

## Async validation

`asyncValidate(value, values)` returns a promise of an error message or `undefined`. A rejection counts as an error, using its message.

- `setValue` on a field with `asyncValidate`:
  - drops that field's previous async error;
  - starts a check after `debounceMs` (immediately if it's 0 or unset), using the `clock`.
- A newer `setValue` cancels a pending timer, and makes an in-flight check's result **stale**. A stale result is ignored.
- `isValidating` is true while any check is debouncing or in flight.

`submit(onSubmit?)`:
1. Touches every configured field.
2. Runs any debouncing checks immediately.
3. Starts checks for async fields that have no result yet.
4. Waits for all checks.
5. If the form is valid, awaits `onSubmit(values)`.

It resolves to `{ ok, errors }`.

## Field arrays

| Method | Effect |
| --- | --- |
| `append(path, item)` | Adds an item at the end. |
| `remove(path, index)` | Removes one item. |
| `move(path, from, to)` | Moves one item. |
| `ids(path)` | Returns one stable id per item. |

Out-of-range indices throw a `RangeError`.

**Stable ids**
- Each item keeps its id when other items are added, removed or moved. New items get new ids.
- Touched state and async errors belong to the **item**, not the index. After `move`, an item's async error shows up at its new index path. Removing an item drops its state and cancels its pending checks.
- Sync and form-level errors are always recomputed from the current values.
- Replacing an array with `setValue` keeps its ids if the length is unchanged. Otherwise it assigns fresh ids.
