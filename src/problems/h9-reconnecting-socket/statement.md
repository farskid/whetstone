# Reconnecting socket client

**reconnecting-websocket** and the browser's **EventSource** (with its Last-Event-ID resume) keep a live connection going across network drops. Build `createReconnectingSocket(options)`. It wraps whatever `options.createSocket(url)` returns.

The wrapped socket is a WebSocket-like object with `send`, `close`, `onopen`, `onmessage({ data })` and `onclose`. Timers come from `options.clock` (`setTimeout` / `clearTimeout`).

The result has these members:

- `state`: `'connecting'`, `'open'` or `'closed'`;
- `send(data)`;
- `subscribe(channel)`, which returns an unsubscribe function;
- `on(event, fn)`, which returns an unsubscribe function;
- `close()`.

## Connecting and backoff

- **First connection.** Create a socket right away. `state` is `'connecting'` until it opens.
- **Reconnecting.** When the socket closes, or fails to connect, schedule a new one.
  - The delay is `min(maxDelay, minDelay · factor^n)`, where n counts the retries so far. The defaults are 1000, 30000 and 2.
  - Emit `reconnecting` with `{ attempt, delay }`, where `attempt` starts at 1.
- **Resetting the backoff.** Once a connection has stayed open for `stableAfterMs` (default 5000), the backoff starts over. A connection that drops sooner doesn't reset it.
- **Events.** `open` fires on every successful connection. `message` fires with the raw `data` string. `close` fires only when an **open** connection is lost.
- **Old sockets.** Ignore every event from a socket that has been replaced. Don't schedule a second retry for the same drop.

## Send buffer

- **While open.** `send` sends at once and returns `true`.
- **Otherwise.** Messages are buffered, up to `maxBuffer` (default 100). Once the buffer is full, `send` returns `false`.
- **Flushing.** On open, the buffer is flushed in order, and each message is sent once.
- **`close()`.** It's permanent:
  - close the current socket, cancel every timer and drop the buffer;
  - `state` becomes `'closed'`, and no events fire;
  - later calls to `send` or `subscribe` throw.

## Subscriptions

- **Subscribe messages.** `subscribe(channel)` sends `{"type":"subscribe","channel":…}` as JSON, either now if the connection is open or as soon as it opens.
- **Resubscribing.** After a reconnect, every channel is resubscribed **before** the buffer is flushed.
- **Resuming.** An incoming JSON message `{ channel, id }` for a subscribed channel records `id` as that channel's last event id. A resubscribe then includes `"lastEventId": id`. Messages that aren't JSON are still emitted.
- **Reference counting.** Subscriptions are counted.
  - Only the first subscriber to a channel sends a subscribe.
  - When the last subscriber leaves, send `{"type":"unsubscribe","channel":…}` (if the connection is open) and forget the channel's last event id.
  - Calling an unsubscribe function a second time does nothing.

## Heartbeat

With `heartbeat: { intervalMs, timeoutMs, ping, isPong }`:

- **Pinging.** `intervalMs` after the connection opens, send `ping()`.
- **Pongs.** If a message for which `isPong(data)` is true arrives within `timeoutMs`, the next ping goes out `intervalMs` after that pong. Pongs are never emitted as messages. A pong you weren't waiting for is ignored.
- **No pong.** If no pong arrives within `timeoutMs`, treat the connection as lost: close that socket and reconnect as usual.
- **Stopping.** Heartbeat timers stop while disconnected and after `close()`.
