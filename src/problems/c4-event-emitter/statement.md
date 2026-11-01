# EventEmitter

Build a typed event emitter with Node's behaviour, plus a promise helper like `events.once`.

```ts
type Events = { data: [chunk: string]; end: []; error: [Error] };
const em = new Emitter<Events>();
em.on('data', (chunk) => buf.push(chunk));   // chunk: string
em.on('*', (name, ...args) => log(name, args));
em.emit('data', 'hello');                     // true

const [chunk] = await once(em, 'data', { signal: AbortSignal.timeout(1000) });
```

## API

```ts
class Emitter<E extends Record<string, unknown[]>> {
  constructor(options?: { onWarning?: (message: string) => void }); // default: console.warn
  on(name, fn): this;                // also on('*', (name, ...args) => void)
  once(name, fn): this;
  prependListener(name, fn): this;
  off(name, fn): this;
  emit(name, ...args): boolean;
  listenerCount(name): number;
  setMaxListeners(n: number): this;
}

function once(emitter, name, options?: { signal?: AbortSignal }): Promise<args>;
```

## Rules

**Listeners**
- `emit` calls the event's listeners in order with the arguments. It returns `true` if any listener ran, wildcard listeners included, and `false` otherwise.
- **Snapshot:** `emit` calls exactly the listeners registered when it started. A listener added during an emit waits for the next one. A listener removed during an emit still runs in the current one.
- Adding the same function twice registers it twice, so it runs twice. `off` removes the **most recently added** matching registration, only one per call. `off` with an unknown function or event does nothing.
- `once` listeners are removed just before they run, so an emit inside the listener doesn't reach them again. `off(name, fn)` with the original `fn` removes a pending `once` listener.
- `prependListener` puts the listener first.
- `listenerCount(name)` counts registrations, `once` listeners included. It doesn't count `*` unless you ask for `'*'`.
- A throwing listener propagates out of `emit`, and the remaining listeners don't run.

**Wildcard**
- `on('*', fn)` runs after the named listeners of every event, as `fn(name, ...args)`.

**Node semantics**
- `emit('error', err)` with no `'error'` listener throws `err` if it is an `Error`, otherwise ``new Error(`Unhandled error. (${String(err)})`)``. Wildcard listeners don't count as handling it.
- The default max is 10 listeners per event. When adding a listener makes an event's count exceed the max, call `onWarning(message)` once for that event name. `setMaxListeners(0)` means no limit.

**`once(emitter, name, { signal })`**
- Resolves with the argument array of the next `name` event.
- If `'error'` is emitted first (and `name` isn't `'error'`), it rejects with that error.
- If the signal aborts, or is already aborted, it rejects with an error whose `name` is `'AbortError'`.
- After it settles, it leaves no listeners behind.

The TypeScript signatures should make `em.emit('data', 42)` a type error for the `Events` above. The tests check behaviour at runtime.
