# Roving focus and typeahead

In a WAI-ARIA listbox, menu or grid, only one item is focusable at a time. The arrow keys move that "active" item, and typing letters jumps to a matching item. Here you'll build the keyboard model behind it, the way **Radix UI** does, with no DOM. Keys are `KeyboardEvent.key` strings.

## `createListbox({ items, clock, loop = false, typeaheadTimeout = 500, pageSize = 10 })`

`items` are `{ label, disabled? }`. The listbox has these members:

- **`active`** is the index of the active item. It starts at the first enabled item, or `-1` when every item is disabled.
- **`handleKey(key)`** returns `true` when the key belongs to the listbox. The caller would then call `preventDefault`.
- **`setActive(index)`** moves to an enabled item and returns `true`. For a disabled item it returns `false` and does nothing. An index outside the list throws a `RangeError`.

### Navigation

Disabled items are **never** active.

| Key | Moves to |
| --- | --- |
| `ArrowDown` / `ArrowUp` | the next or previous enabled item. At the end of the list, stay put, or wrap around when `loop` is `true`. |
| `Home` / `End` | the first or last enabled item |
| `PageDown` / `PageUp` | Up to `pageSize` items further, clamped to the list. If the target is disabled, take the furthest enabled item between the current one and the target. If there's none, take the next enabled item beyond the target. Paging never loops. |

These keys return `true` even when the active item doesn't change. When every item is disabled, nothing ever moves.

### Typeahead

Any other key that is a single character takes part in typeahead:

1. **Build the query.** Append the character, lowercased, to the query. The query resets to empty `typeaheadTimeout` ms after the **last** character.
2. **Choose the search string.** If the query is one character repeated, as in `'a'` or `'aaa'`, the search string is that single character. Otherwise it is the whole query.
3. **Search.** Look for the first enabled item whose lowercased label starts with the search string. The search **always wraps** around the end of the list, whatever `loop` is set to.
   - For a one-character search, start at the item **after** the active one. Pressing `b` repeatedly cycles through the items that start with B.
   - For a longer search, start **at** the active item. Typing `br` after `b` stays on "Brazil" instead of skipping it.
4. **No match.** If nothing matches, the active item doesn't change.

**Space.** A space (`' '`) is part of typeahead only while a query is in progress. Typing `new y` should find "New York". On its own, a space returns `false`, so the caller can use it to select.

Typeahead keys return `true`. Keys that are neither navigation nor single characters, like `'Tab'` and `'Enter'`, return `false`.

## `createGrid({ count, columns, rtl = false })`

`count` items fill the rows from left to right, `columns` per row. The last row may be shorter. `active` starts at `0`, or `-1` when `count` is 0.

| Key | Moves to |
| --- | --- |
| `ArrowRight` / `ArrowLeft` | the next or previous item **within the row**. There's no wrap into the neighbouring row. With `rtl: true`, the two keys swap meaning: ArrowRight moves to the previous index. |
| `ArrowDown` | the same column in the next row. If that row is too short, the last item. On the last row, stay put. |
| `ArrowUp` | the same column in the previous row. On the first row, stay put. |
| `Home` / `End` | the first or last item of the current row. With `{ ctrlKey: true }` as the second argument, the first or last item of the grid. |

`handleKey(key, mods?)` returns `true` for these keys and `false` for anything else.
