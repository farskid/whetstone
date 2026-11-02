Track the **selection** with each step, and add a **command history** for state you can't snapshot.

```ts
const h = createHistory<string, [number, number]>('');
h.push('ab', { selection: [2, 2] });
h.push('abc', { selection: [3, 3] });
h.undo();        // h.state === 'ab', h.selection deep-equals [2, 2]

const cmds = createCommandHistory();
cmds.execute({ do: () => list.push(1), undo: () => list.pop() });
cmds.undo();     // list is empty again
```

```ts
interface PushOptions<Sel> { groupKey?: string; selection?: Sel }
interface History<S, Sel = unknown> { readonly selection: Sel | undefined; /* … */ }
function createHistory<S, Sel = unknown>(initial: S, options?: HistoryOptions): History<S, Sel>;

interface Command { do(): void; undo(): void }
interface CommandHistory {
  execute(command: Command): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}
function createCommandHistory(options?: { capacity?: number }): CommandHistory;
```

### Selection
- `history.selection` is the present selection, initially `undefined`.
- `push`'s `selection` defaults to the current selection. Each step remembers its own selection, so `undo`/`redo` restore the selection together with the state.
- A coalesced push replaces the selection too. `rollback()` restores the selection from its `begin()`.

### Command history
- `execute(command)` calls `do()`, records the command and clears redo. If `do()` throws, the error propagates and nothing is recorded.
- `undo()` calls the latest command's `undo()`. `redo()` calls the latest undone command's `do()` again. Both return `true`, or `false` when there is nothing to do.
- If a command's `undo` or `do` throws during undo/redo, the error propagates and both stacks stay as they were.
- `capacity` limits the number of undoable commands (default: unlimited); the oldest are dropped first.
