# Reconnecting socket client: send buffer

Add `send(data)` and `close()`. Messages sent while the connection is down are kept and sent when it comes back. `state` can now also be `'closed'`.

```ts
sock.send('hello');  // true: sent now, or buffered until the next open
sock.close();        // for good
```

## Rules

- **While open.** `send` sends at once and returns `true`.
- **Otherwise.** Messages are buffered, up to `maxBuffer` (default 100). Once the buffer is full, `send` returns `false`.
- **Flushing.** On open, the buffer is flushed in order, and each message is sent once.
- **`close()`.** It's permanent:
  - close the current socket, cancel every timer and drop the buffer;
  - `state` becomes `'closed'`, and no events fire;
  - later calls to `send` or `subscribe` throw.

Everything from earlier stages still applies.
