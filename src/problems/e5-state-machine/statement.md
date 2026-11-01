# State machine interpreter

Build a small XState: a **pure** `createMachine(config, options?).transition(state, event)` and an `interpret(machine, { clock })` service that runs side effects, timers and promises.

```ts
const toggle = createMachine({
  initial: 'off',
  context: { flips: 0 },
  states: {
    off: { on: { TOGGLE: { target: 'on', actions: assign({ flips: (c) => c.flips + 1 }) } } },
    on:  { on: { TOGGLE: 'off' }, after: { 5000: 'off' } },
  },
});
toggle.transition(toggle.initialState, 'TOGGLE').value;   // 'on'
```

## Config

A state node may have the keys below. The machine config is the root node, plus `context`.

| Key | Meaning |
| --- | --- |
| `initial`, `states` | Child states. A node with children must name a valid `initial`. |
| `on: { [event]: spec }` | Transitions for an event. |
| `entry`, `exit` | An action or array of actions. |
| `type: 'final'` | Marks a final state. |
| `onDone: spec` | Taken when a child final state is entered. |
| `after: { [ms]: spec }` | Delayed transitions. |
| `invoke: { src(ctx, event) → Promise, onDone?, onError? }` | A promise started when the state is entered. |

**Transition spec.** A spec is `'target'`, `{ target?, guard?, actions? }`, or an array of those. In an array, the first candidate whose guard passes wins.

**Targets**
- A plain name is a **sibling** of the state that declares the transition. Dots go deeper, as in `'loading.retry'`.
- `'#a.b'` is an absolute path from the root.
- No target is a transition that runs actions without leaving any state.
- A transition from a state to itself exits and re-enters it.

**Guards** are functions `(ctx, event) => boolean`, or names looked up in `options.guards`.

**Actions** are functions `(ctx, event) => void`, names from `options.actions`, or `assign(updater)`.
- `assign` updates `context` immediately, in order, during the transition. The updater is either `(ctx, event) => partial` or an object whose values are values or `(ctx, event) => value`.
- `assign` actions never appear in `state.actions`.

## `machine.initialState` and `machine.transition(state, event)`

`event` is a string or `{ type, ...payload }`. `transition` must not mutate its input.

A state is:

```ts
{ value, context, actions, event, changed, done, entered, exited, matches(path) }
```

| Field | Meaning |
| --- | --- |
| `value` | Dot path of the active leaf, e.g. `'loading.retry'`. |
| `matches(p)` | True for the leaf and every ancestor path. |
| `actions` | The non-assign actions to run, in order. |
| `entered` / `exited` | State paths, in the order they were entered or exited. |
| `changed` | `false` when no transition was taken. The state is then the same with `actions: []`. |
| `done` | `true` once a **top-level** final state is entered. After that every event is ignored. |

**Initial state.** Enter `initial` recursively, running the entry actions from the outermost state inwards.

**Choosing a transition.** Look for a handler on the active leaf, then on its ancestors, then on the root. The first node with an enabled candidate wins.

**Action order**
1. Exit actions, innermost first, for every active state below the transition's domain. The domain is the nearest common ancestor of source and target that is a *proper* ancestor of the source.
2. The transition's actions.
3. Entry actions, outermost first, down to the new leaf, following `initial`s.

**Final states.** Entering a final state whose parent has a passing `onDone` takes that transition, as if from the parent, with event `{ type: 'done.state.<parentPath>' }`. Repeat this if that transition lands on another final state.

**Synthetic events.** `after` and `invoke` become ordinary transitions on their node. Use the exported helpers to name the events:
- `afterEvent(ms, path)`
- `doneInvokeEvent(path)`, with payload `{ data }`
- `errorInvokeEvent(path)`, with payload `{ data }`

## `interpret(machine, { clock })`

| Method | Behavior |
| --- | --- |
| `start()` | Enters the initial state and returns the service. |
| `send(event)` | Transitions, runs `actions` (names come from `machine.options.actions`) with the new context and event, then notifies subscribers. Ignored before `start()` and after `stop()`; unchanged transitions notify no one. |
| `state` | The current state. |
| `subscribe(fn)` | Returns an unsubscribe function. |
| `stop()` | Stops the service. |

**Timers and promises**
- Entering a state with `after` schedules each delay on `clock.setTimeout`. Entering a state with `invoke` calls `src(ctx, event)`.
- Leaving that state, re-entering it (that's a new activation), or calling `stop()` makes the old timers and promises **no-ops**, even if they fire or settle later.
