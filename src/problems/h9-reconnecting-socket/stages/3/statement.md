# Reconnecting socket client: subscriptions

Add `subscribe(channel)`. A reconnect must restore every channel, and resume each one from the last event it saw, like EventSource's Last-Event-ID.

```ts
const off = sock.subscribe('prices'); // sends {"type":"subscribe","channel":"prices"}
off();                                 // sends {"type":"unsubscribe","channel":"prices"}
```

## Rules

- **Subscribe messages.** `subscribe(channel)` returns an unsubscribe function. It sends `{"type":"subscribe","channel":…}` as JSON, either now if the connection is open or as soon as it opens. <!-- tests: subscribes on open and resubscribes before flushing the buffer -->
- **Resubscribing.** After a reconnect, every channel is resubscribed **before** the buffer is flushed. <!-- tests: subscribes on open and resubscribes before flushing the buffer -->
- **`close()`.** After `close()`, `subscribe` throws too.
- **Resuming.** An incoming JSON message `{ channel, id }` for a subscribed channel records `id` as that channel's last event id. A resubscribe then includes `"lastEventId": id`. Messages that aren't JSON are still emitted. <!-- tests: resumes each channel from its last event id -->
- **Reference counting.** Subscriptions are counted. <!-- tests: counts subscriptions to the same channel -->
  - Only the first subscriber to a channel sends a subscribe. <!-- tests: counts subscriptions to the same channel -->
  - When the last subscriber leaves, send `{"type":"unsubscribe","channel":…}` (if the connection is open) and forget the channel's last event id. <!-- tests: counts subscriptions to the same channel -->
  - Calling an unsubscribe function a second time does nothing.

Everything from earlier stages still applies.
