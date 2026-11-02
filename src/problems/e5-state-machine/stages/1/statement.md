Build the core of a small XState: a **pure** state machine with flat states.

```ts
const light = createMachine({
  initial: 'green',
  on: { RESET: 'green' },
  states: {
    green: { on: { TIMER: 'yellow' } },
    yellow: { on: { TIMER: 'red' } },
    red: { on: { TIMER: 'green', POWER_OUT: 'off' } },
    off: { type: 'final' },
  },
});
const s1 = light.transition(light.initialState, 'TIMER');
s1.value;                              // 'yellow'
light.transition(s1, 'NOPE').changed;  // false
```

```ts
interface MachineState { value: string; actions: string[]; event: EventObject; changed: boolean; done: boolean }
interface Machine {
  initialState: MachineState;
  transition(state: MachineState, event: Event): MachineState;
}
function createMachine(config: MachineConfig): Machine;
```

- `config.states` maps each state name to `{ on?, type? }`. `on` maps an event type to the **name** of the next state.
- `config.on` holds root-level handlers. The active state's handler wins; the root's is used only when the state has none for that event.
- `event` is a string or `{ type, ...payload }`. `state.event` is the event as an object; for `initialState` it's `{ type: 'xstate.init' }`.
- `initialState` has `value: config.initial` and `changed: true`.
- **No handler:** the result has the same `value`, `changed: false` and `actions: []`.
- `done` is `true` when the state is `type: 'final'`. Every event sent to a done state is ignored (`changed: false`).
- `transition` must not mutate its input; return a new state object.
- `actions` is always `[]` in this stage.
- Throw an `Error` for an unknown `initial` or target.
