Add **guards**, **context** and **actions**. States are still flat.

```ts
const m = createMachine({
  initial: 'a',
  context: { n: 1 },
  states: {
    a: { exit: 'exitA', on: { GO: { target: 'b', actions: 'go' }, ADD: { actions: assign({ n: (c) => c.n + 1 }) } } },
    b: { entry: ['enterB1', 'enterB2'] },
  },
});
m.transition(m.initialState, 'GO').actions;     // ['exitA', 'go', 'enterB1', 'enterB2']
m.transition(m.initialState, 'ADD').context;    // { n: 2 }
```

```ts
function createMachine(config: MachineConfig, options?: MachineOptions): Machine;
function assign(updater): AssignAction;
// MachineState gains: context, entered, exited
```

**Transition spec.** A handler (in a state's `on` or the root `on`) is `'target'`, `{ target?, guard?, actions? }`, or an array of those. In an array, the first candidate whose guard passes wins. If no candidate of the state's handler passes, try the root's. If none passes, nothing changes. <!-- tests: guards pick the first passing candidate, by function or by name -->

**Guards** are `(ctx, event) => boolean`, or names looked up in `options.guards` (throw for an unknown name). <!-- tests: guards pick the first passing candidate, by function or by name -->

**Actions** are functions `(ctx, event) => void`, names, or `assign(updater)`. `entry` and `exit` on a state take one action or an array.
- `assign` updates `context` immediately, in order, during the transition. The updater is either `(ctx, event) => partial` or an object whose values are plain values or `(ctx, event) => value`. Never mutate the old context. <!-- tests: assign updates context in order without mutating; actions exclude assign -->
- `state.actions` lists the **non-assign** actions to run, in order. <!-- tests: assign updates context in order without mutating; actions exclude assign -->

**Order** of a transition with a target: the source's `exit` actions, then the transition's `actions`, then the target's `entry` actions. A transition to the same state exits and re-enters it. <!-- tests: exit → transition → entry order, and self-transitions re-enter -->

- A transition **without a target** runs its actions and stays put: nothing is exited or entered, and `changed` is `true`.
- `entered` / `exited` list the state names entered and exited by this transition.
- `context` starts as a copy of `config.context` (default `{}`). `initialState` runs the initial state's `entry` actions and has `entered: [initial]`.
- An unchanged state keeps its `context` with `actions: []`, `entered: []` and `exited: []`.
