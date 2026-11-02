Add **transactions**: several pushes that undo as one step.

```ts
h.begin();
h.push(1);
h.push(2);
h.commit();      // one undo step
h.undo();        // back to before begin()
```

```ts
// History gains:
begin(): void;
commit(): void;
rollback(): void;
```

- `begin()` starts a transaction, and transactions nest.
- Pushes inside a transaction change `state` but don't create steps, don't coalesce and don't touch redo.
- The outermost `commit()` turns everything since its `begin()` into **one** undo step and clears redo. If the present is still the snapshot from that `begin()` (nothing was pushed, or every push was rolled back), it adds no step and keeps redo.
- An inner `commit()` just hands its changes to the enclosing transaction.
- `rollback()` closes the innermost transaction, restores the state from its `begin()`, and adds no step. Redo is kept.
- `commit()` / `rollback()` without an open transaction throw `No transaction`.
- `undo()` and `redo()` inside a transaction throw an `Error`, and `canUndo()` / `canRedo()` return `false` there.
- `commit()` and `rollback()` break coalescing, like `undo` and `redo`.
- Capacity applies to a committed step like any other.
