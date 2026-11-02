# Reconnecting socket client: heartbeat

A connection can die without a close event. Add an optional **heartbeat** that pings the server and reconnects when the pong doesn't come back.

```ts
createReconnectingSocket({ url, createSocket, heartbeat: { intervalMs: 10_000, timeoutMs: 3000, ping: () => 'ping', isPong: (d) => d === 'pong' } });
```

## Rules

With `heartbeat: { intervalMs, timeoutMs, ping, isPong }`:

- **Pinging.** `intervalMs` after the connection opens, send `ping()`.
- **Pongs.** If a message for which `isPong(data)` is true arrives within `timeoutMs`, the next ping goes out `intervalMs` after that pong. Pongs are never emitted as messages. A pong you weren't waiting for is ignored.
- **No pong.** If no pong arrives within `timeoutMs`, treat the connection as lost: close that socket and reconnect as usual.
- **Stopping.** Heartbeat timers stop while disconnected and after `close()`.

Everything from earlier stages still applies.
