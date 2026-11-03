Add **delayed transitions**, **invoked promises**, and an **interpreter** that runs the side effects.

```ts
const m = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: { invoke: { src: () => fetchUser(), onDone: 'ok', onError: 'failed' }, after: { 5000: 'failed' } },
    ok: {}, failed: {},
  },
}, { actions: { log: (ctx, e) => console.log(e.type) } });

const service = interpret(m, { clock }).start();
service.send('FETCH');   // starts the promise and the 5 s timer
```

```ts
interface Clock { now(): number; setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void }
interface Service {
  start(): Service;
  send(event: Event): void;
  readonly state: MachineState;
  subscribe(listener: (state: MachineState) => void): () => void;
  stop(): void;
}
interface InterpretOptions { clock?: Clock }
function interpret(machine: Machine, options?: InterpretOptions): Service;
// Machine gains: options, config. State nodes gain: after, invoke.
```

### Synthetic events
`after: { [ms]: spec }` and `invoke: { src(ctx, event) → Promise, onDone?, onError? }` become ordinary transitions on their node. Export helpers that name the events (`path` is the node's dot path):
- `afterEvent(ms, path)`
- `doneInvokeEvent(path)`, sent with payload `{ data }` (the resolved value)
- `errorInvokeEvent(path)`, sent with payload `{ data }` (the rejection reason)

`machine.options` and `machine.config` expose what was passed to `createMachine`.

### `interpret(machine, { clock })`
- `clock` defaults to the real timers.
- `start()` enters the initial state, runs its actions, notifies subscribers and returns the service. A second `start()` does nothing. <!-- tests: service runs actions, notifies subscribers and ignores sends when stopped -->
- `send(event)` transitions, runs `state.actions` (names come from `machine.options.actions`; unknown names are skipped) with the new context and event, then notifies subscribers. Sends are ignored before `start()` and after `stop()`. Unchanged transitions notify no one. <!-- tests: service runs actions, notifies subscribers and ignores sends when stopped -->
- `state` is the current state. `subscribe(fn)` returns an unsubscribe function.

### Timers and promises
- Entering a state with `after` schedules each delay on `clock.setTimeout`; when it fires, the service sends that state's `afterEvent`. <!-- tests: after timers fire, and are cancelled by leaving, re-entering or stopping -->
- Entering a state with `invoke` calls `src(ctx, event)` with the new context and event. A thrown error counts as a rejection. <!-- tests: invoked promises resolve or reject into transitions; stale ones are ignored -->
- Leaving that state, re-entering it (that's a new activation), or calling `stop()` makes the old timers and promises **no-ops**, even if they fire or settle later. Clear the timers you no longer need. <!-- tests: after timers fire, and are cancelled by leaving, re-entering or stopping | invoked promises resolve or reject into transitions; stale ones are ignored -->
