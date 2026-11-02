Build the snapshot stack behind an editor's undo button.

```ts
const h = createHistory('');
h.push('a');
h.push('ab');
h.undo();        // true, h.state === 'a'
h.redo();        // true, h.state === 'ab'
h.redo();        // false: nothing to redo
```

```ts
interface History<S> {
  readonly state: S;
  push(state: S): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}
function createHistory<S>(initial: S): History<S>;
```

- `state` is the present state, starting at `initial`.
- `push(state)` makes `state` the present. The old present becomes one undo step.
- A push **clears the redo stack**.
- `undo()` / `redo()` move one step and return `true`. They return `false`, changing nothing, when there is nothing to undo or redo.
- `canUndo()` / `canRedo()` report whether that's possible.
- Ignore any extra arguments; options come in the next stage.
