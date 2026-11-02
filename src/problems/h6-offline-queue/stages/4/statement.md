# Offline mutation queue: coalescing

Typing in a note produces a write per keystroke. Add **coalescing**: a newer write with the same `dedupeKey` replaces one that hasn't been sent yet.

```ts
q.enqueue('note.update', { id: 7, text: 'draft' }, { dedupeKey: 'note:7' });
q.enqueue('note.update', { id: 7, text: 'final' }, { dedupeKey: 'note:7' }); // replaces the queued one
```

`enqueue(type, payload, opts?: { dedupeKey?: string })` now takes options. A mutation created with a `dedupeKey` has that `dedupeKey` field; one without has no such field.

**Coalescing.** `enqueue` with a `dedupeKey` that matches a queued mutation **that is not in flight** replaces that mutation's `type` and `payload` in place. It keeps that mutation's position, id and attempts, and returns its id. If the only match is in flight, append a new mutation instead.

A coalesce is a change to the queue, so it is saved. A coalesced-away payload isn't reported to `onSettled` separately.

Everything from earlier stages still applies.
