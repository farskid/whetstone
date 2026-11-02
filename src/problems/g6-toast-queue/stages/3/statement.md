# Toast queue: updates and duplicates

Let callers change a toast in place, and stop identical toasts from stacking up.

```ts
const id = t.toast('Syncing', { id: 'sync' });
t.toast('Synced 3 files', { id: 'sync' }); // updates the same toast
t.toast('Offline', { type: 'error' });
t.toast('Offline', { type: 'error' });     // same toast, count: 2
```

## `update(id, { message?, type?, duration? })`

This changes a toast in place. It keeps its position, on screen or in the queue. It returns `true`, or `false` for an unknown id.

- **Message only.** Changing just the message doesn't touch the timer.
- **Type or duration.** Changing the type, or giving a duration, restarts the timer with the full duration (for a queued toast, that full duration is what it gets once shown). When the type changes and no duration is given, the duration goes back to the new type's default. For example, a loading toast that becomes `'success'` gets the toaster's default.

## `toast(message, { id?, type, duration? })`

- **Custom ids.** If `id` is given and that toast exists, visible or queued, this updates it like `update(id, { message, type, duration })` and returns the same id. An `id` that doesn't exist yet becomes the new toast's id.
- **Duplicates.** Without an `id`, a toast with the **same message and type** as an existing one, visible or queued, isn't added again. The existing toast's `count` goes up by one, its full duration restarts, and its id is returned.

Everything from earlier stages still applies.
