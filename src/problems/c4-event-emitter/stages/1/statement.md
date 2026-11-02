Build a typed event emitter. Start with registering, removing and calling listeners.

```ts
type Events = { data: [chunk: string]; end: [] };
const em = new Emitter<Events>();
const onData = (chunk: string) => buf.push(chunk);
em.on('data', onData).on('end', () => done());
em.emit('data', 'hello');      // true
em.off('data', onData);
em.emit('data', 'again');      // false: nobody listened
```

```ts
type EventMap = Record<string, unknown[]>;     // event name → argument tuple

class Emitter<E extends EventMap> {
  on(name, fn): this;
  off(name, fn): this;
  emit(name, ...args): boolean;
  listenerCount(name): number;
}
```

- `emit` calls the event's listeners in registration order with the arguments. It returns `true` if any listener ran and `false` otherwise.
- **Snapshot:** `emit` calls exactly the listeners registered when it started. A listener added during an emit waits for the next one. A listener removed during an emit still runs in the current one.
- Adding the same function twice registers it twice, so it runs twice. `off` removes the **most recently added** matching registration, only one per call. `off` with an unknown function or event does nothing.
- `listenerCount(name)` counts registrations (0 for an unknown event).
- A throwing listener propagates out of `emit`, and the remaining listeners don't run.
- `on` and `off` return the emitter, for chaining. The signatures should make `em.emit('data', 42)` a type error for the `Events` above; the tests check behaviour at runtime.
