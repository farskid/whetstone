# Router history: scroll and limits

Remember a scroll position per entry, and cap the stack's length.

```ts
const h = createMemoryHistory({ maxLength: 50 });
h.saveScroll(320);
h.push('/next');
h.back();
h.getScroll(); // 320
```

## Scroll positions

- **`saveScroll(y)`** remembers `y` for the current entry. <!-- tests: scroll positions are per entry -->
- **`getScroll(key?)`** returns the remembered value for that entry, or the current entry if no key is given. It returns `undefined` when nothing was saved. <!-- tests: scroll positions are per entry -->
- **Discarded entries.** An entry that's discarded loses its scroll data. That covers entries replaced, cut off by a `push`, or dropped by `maxLength`.

## `maxLength`

- **`maxLength`** is a new option. It must be a positive integer or `Infinity` (the default). Otherwise `createMemoryHistory` throws a `RangeError`.
- When a `push` makes the stack longer than `maxLength`, the **oldest** entries are dropped. The index shifts to match. <!-- tests: maxLength drops the oldest entries -->

Everything from earlier stages still applies.
