Add one-shot listeners, listeners that go first, and a wildcard that sees every event.

```ts
em.once('end', () => close());
em.prependListener('data', audit);
em.on('*', (name, ...args) => log(name, args));

// Emitter, plus:
once(name, fn): this;
prependListener(name, fn): this;
on(name: '*', fn: (name, ...args) => void): this;   // off, listenerCount also accept '*'
```

**once and prepend**
- `once` listeners run at most once. They are removed just before they run, so an emit inside the listener doesn't reach them again.
- `off(name, fn)` with the original `fn` removes a pending `once` listener (still the most recent matching registration, whether added with `on` or `once`).
- `prependListener` puts the listener first.
- `listenerCount(name)` counts `once` listeners until they run.

**Wildcard**
- `on('*', fn)` runs after the named listeners of every event, as `fn(name, ...args)`. It also runs for events with no named listeners.
- `emit` returns `true` if any listener ran, wildcard listeners included.
- `listenerCount(name)` doesn't count `*` listeners; `listenerCount('*')` counts them.
