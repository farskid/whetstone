Add **nested states**: hierarchy, bubbling, dotted and absolute targets, and final states with `onDone`.

```ts
const m = createMachine({
  initial: 'app',
  states: {
    app: {
      initial: 'editor',
      on: { LOGOUT: 'login' },
      states: { editor: { initial: 'idle', states: { idle: { on: { TYPE: 'typing' } }, typing: {} } } },
    },
    login: {},
  },
});
m.initialState.value;                              // 'app.editor.idle'
m.initialState.matches('app.editor');              // true
m.transition(m.initialState, 'LOGOUT').value;      // 'login'
```

The machine config is now a state node itself: any node may have `initial` and `states`, plus `onDone`. `MachineState` gains `matches(path)`.

- A node with children must name a valid `initial`; `createMachine` throws otherwise. Entering a node enters its `initial` child, recursively.
- `value` is the dot path of the active leaf, e.g. `'app.editor.idle'`. `matches(p)` is true for the leaf and every ancestor path, and only on whole segments (`'app.edit'` doesn't match).
- `entered` / `exited` hold full dot paths.

**Targets**
- A plain name is a **sibling** of the state that declares the transition. Dots go deeper, as in `'q.y'`. On the root, a name is a top-level state.
- `'#a.b'` is an absolute path from the root.

**Choosing a transition.** Look for an enabled candidate on the active leaf, then on its ancestors, then on the root. The first node with one wins; a blocked guard falls through to the parent.

**Action order**
1. Exit actions, innermost first, for every active state below the transition's **domain**: the nearest common ancestor of source and target that is a *proper* ancestor of the source. So a parent handler targeting its own child exits and re-enters the parent.
2. The transition's actions.
3. Entry actions, outermost first, down to the new leaf, following `initial`s.

The initial state runs entry actions from the outermost state inwards.

**Final states**
- Entering a final state whose parent has a passing `onDone` takes that transition, as if from the parent, with event `{ type: 'done.state.<parentPath>' }`. Repeat if that lands on another final state.
- `done` is `true` only once a **top-level** final state is entered. After that every event is ignored.
