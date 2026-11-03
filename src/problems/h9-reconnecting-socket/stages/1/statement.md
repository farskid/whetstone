# Reconnecting socket client: connecting and backoff

**reconnecting-websocket** and the browser's **EventSource** (with its Last-Event-ID resume) keep a live connection going across network drops. Build `createReconnectingSocket(options)`. It wraps whatever `options.createSocket(url)` returns.

The wrapped socket is a WebSocket-like object with `send`, `close`, `onopen`, `onmessage({ data })` and `onclose`. Timers come from `options.clock` (`setTimeout` / `clearTimeout`).

```ts
const sock = createReconnectingSocket({ url: 'wss://x/feed', createSocket: (u) => new WebSocket(u) });
sock.on('reconnecting', ({ attempt, delay }) => console.log(`retry ${attempt} in ${delay} ms`));
```

In this stage the result has two members:

- `state`: `'connecting'` or `'open'`;
- `on(event, fn)` for `'open'`, `'message'`, `'close'` and `'reconnecting'`. It returns an unsubscribe function.

## Rules

- **First connection.** Create a socket right away. `state` is `'connecting'` until it opens. <!-- tests: connects at once and reconnects with capped exponential backoff -->
- **Reconnecting.** When the socket closes, or fails to connect, schedule a new one.
  - The delay is `min(maxDelay, minDelay · factor^n)`, where n counts the retries so far. The defaults are 1000, 30000 and 2. <!-- tests: connects at once and reconnects with capped exponential backoff -->
  - Emit `reconnecting` with `{ attempt, delay }`, where `attempt` starts at 1.
- **Resetting the backoff.** Once a connection has stayed open for `stableAfterMs` (default 5000), the backoff starts over. A connection that drops sooner doesn't reset it. <!-- tests: the backoff resets only after a connection stays up for stableAfterMs -->
- **Events.** `open` fires on every successful connection. `message` fires with the raw `data` string. `close` fires only when an **open** connection is lost.
- **Old sockets.** Ignore every event from a socket that has been replaced. Don't schedule a second retry for the same drop. <!-- tests: ignores events from old sockets and never doubles up timers -->
