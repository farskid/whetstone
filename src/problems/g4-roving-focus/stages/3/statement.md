# Roving focus: grid

Add a two-dimensional grid with the same roving-focus idea.

```ts
const grid = createGrid({ count: 10, columns: 4 }); // rows of 4, 4, 2
grid.handleKey('ArrowDown'); // 0 → 4
```

```ts
createGrid(options: { count: number; columns: number; rtl?: boolean }): {
  readonly active: number;
  handleKey(key: string, mods?: { ctrlKey?: boolean }): boolean;
}
```

## `createGrid({ count, columns, rtl = false })`

`count` items fill the rows from left to right, `columns` per row. The last row may be shorter. `active` starts at `0`, or `-1` when `count` is 0.

| Key | Moves to |
| --- | --- |
| `ArrowRight` / `ArrowLeft` | the next or previous item **within the row**. There's no wrap into the neighbouring row. With `rtl: true`, the two keys swap meaning: ArrowRight moves to the previous index. |
| `ArrowDown` | the same column in the next row. If that row is too short, the last item. On the last row, stay put. |
| `ArrowUp` | the same column in the previous row. On the first row, stay put. |
| `Home` / `End` | the first or last item of the current row. With `{ ctrlKey: true }` as the second argument, the first or last item of the grid. |

`handleKey(key, mods?)` returns `true` for these keys and `false` for anything else.

Everything from earlier stages still applies.
