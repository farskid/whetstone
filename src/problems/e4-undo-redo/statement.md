# Undo/redo history

Build the history stack behind an editor's undo button.

```ts
const h = createHistory('', { clock });
h.push('h', { groupKey: 'typing' });
h.push('hi', { groupKey: 'typing' });   // within 500 ms: same step
h.undo();                               // h.state === ''
h.redo();                               // h.state === 'hi'
```

## `createHistory(initial, { capacity?, coalesceMs = 500, clock? })`

`clock` is `{ now(): number }` and defaults to `Date.now`.

`history.state` is the present state. `history.selection` is the present selection (initially `undefined`).

### `push(state, { groupKey?, selection? })`
- Records a new present and clears the redo stack.
- `selection` defaults to the current selection. Each step remembers its own selection, so `undo`/`redo` restore the selection together with the state.
- **Coalescing:** the push replaces the present instead of adding an undo step when all of these hold:
  - it has a `groupKey`;
  - the previous push had the **same** `groupKey`;
  - at most `coalesceMs` passed since that previous push.

  The gap is measured from the previous push, not the first one in the group. One undo then goes back to before the whole group.
- `undo`, `redo` and `commit` break coalescing: the next push always starts a new step.

### Undo and redo
- `undo()` / `redo()` move one step and return `true`. They return `false` when there is nothing to undo or redo.
- `canUndo()` / `canRedo()` report whether that's possible.

### Capacity
At most `capacity` undo steps are kept. The oldest are dropped first.

### Transactions
- `begin()` starts a transaction, and transactions nest.
- Pushes inside a transaction change `state` but don't create steps and don't coalesce.
- The outermost `commit()` turns everything since its `begin()` into **one** undo step and clears redo. If the state never changed, it adds no step.
- An inner `commit()` just hands its changes to the enclosing transaction.
- `rollback()` restores the state and selection from that transaction's `begin()` and adds no step.
- `commit()` / `rollback()` without an open transaction throw `No transaction`.
- `undo()` and `redo()` inside a transaction throw, and `canUndo()` / `canRedo()` return `false` there.

## `createCommandHistory({ capacity? })`

The command pattern, for when you can't snapshot state.
- `execute({ do, undo })` calls `do()`, records the command and clears redo. If `do()` throws, nothing is recorded.
- `undo()` calls the latest command's `undo()`. `redo()` calls `do()` again. Both return `true`/`false` like above.
- If a command's `undo` or `do` throws during undo/redo, the error propagates and the stacks stay as they were.
- `capacity` limits the number of undoable commands.
