# Roving focus and typeahead

In a WAI-ARIA listbox, menu or grid, only one item is focusable at a time. The arrow keys move that "active" item, and typing letters jumps to a matching item. Here you'll build the keyboard model behind it, the way **Radix UI** does, with no DOM. Keys are `KeyboardEvent.key` strings.

This stage covers moving with the navigation keys.

```ts
const lb = createListbox({ items: [{ label: 'a' }, { label: 'b', disabled: true }, { label: 'c' }] });
lb.handleKey('ArrowDown'); // true
lb.active;                 // 2: the disabled item was skipped
```

## `createListbox({ items, loop = false, pageSize = 10 })`

`items` are `{ label, disabled? }`. Tests may also pass a `clock` option; ignore it in this stage. The listbox has these members:

- **`active`** is the index of the active item. It starts at the first enabled item, or `-1` when every item is disabled.
- **`handleKey(key)`** returns `true` when the key belongs to the listbox. The caller would then call `preventDefault`.
- **`setActive(index)`** moves to an enabled item and returns `true`. For a disabled item it returns `false` and does nothing. An index outside the list throws a `RangeError`.

## Navigation

Disabled items are **never** active.

| Key | Moves to |
| --- | --- |
| `ArrowDown` / `ArrowUp` | the next or previous enabled item. At the end of the list, stay put, or wrap around when `loop` is `true`. |
| `Home` / `End` | the first or last enabled item |
| `PageDown` / `PageUp` | Up to `pageSize` items further, clamped to the list. If the target is disabled, take the furthest enabled item between the current one and the target. If there's none, take the next enabled item beyond the target. Paging never loops. |

These keys return `true` even when the active item doesn't change. When every item is disabled, nothing ever moves.

Every other key returns `false` in this stage, including single characters and `' '`.
