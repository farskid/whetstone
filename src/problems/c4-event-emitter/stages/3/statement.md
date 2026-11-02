Add Node's behaviour: unhandled errors, the leak warning, and a promise helper like `events.once`.

```ts
const em = new Emitter<Events>({ onWarning: (m) => log.warn(m) });
em.emit('error', new Error('boom'));        // throws if nobody listens for 'error'
const [chunk] = await once(em, 'data', { signal: AbortSignal.timeout(1000) });

class Emitter<E> {
  constructor(options?: { onWarning?: (message: string) => void }); // default: console.warn
  // ...stage 2, plus:
  setMaxListeners(n: number): this;
}
function once(emitter, name, options?: { signal?: AbortSignal }): Promise<args>;
```

**Errors**
- `emit('error', err)` with no `'error'` listener throws `err` if it is an `Error`, otherwise ``new Error(`Unhandled error. (${String(err)})`)``. Wildcard listeners don't count as handling it, and don't run.

**Max listeners**
- The default max is 10 listeners per event. When adding a listener (with `on`, `once` or `prependListener`) makes an event's count exceed the max, call `onWarning(message)`, only the first time for that event name. `setMaxListeners(n)` changes the max for later additions; `0` means no limit.

**`once(emitter, name, { signal })`**
- Resolves with the argument array of the next `name` event.
- If `'error'` is emitted first (and `name` isn't `'error'`), it rejects with that error. With `name === 'error'` it resolves with the error's arguments like any event.
- If the signal aborts, or is already aborted, it rejects with an error whose `name` is `'AbortError'`.
- After it settles, it leaves no listeners behind (on the emitter or the signal).
