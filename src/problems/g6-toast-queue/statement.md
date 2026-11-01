# Toast queue

Toasts are the small notifications that pop up in a corner and fade away. The tricky part is managing them: how many show at once, when their timers run, and what happens when the same message fires five times. Here you'll build that manager, the way **sonner** does, with an injected `clock` (`now`, `setTimeout`, `clearTimeout`).

## `createToaster({ clock, maxVisible = 3, duration = 4000 })`

A toast looks like `{ id, message, type, duration, count }`. Its `type` is `'default' | 'success' | 'error' | 'info' | 'loading'`.

- **`getVisible()`** and **`getQueued()`** return copies of the toasts on screen and waiting, oldest first.

### `toast(message, { id?, type = 'default', duration? })`

This returns the toast's id:

- **Duration.** A toast without an explicit `duration` gets the toaster's default. `'loading'` toasts default to `Infinity`, which means they never auto-dismiss.
- **On screen.** A toast is shown if fewer than `maxVisible` are on screen. Its timer starts then, and it dismisses itself after `duration` ms.
- **Queued.** Otherwise it waits in a FIFO queue. Its timer **doesn't start until it's shown**, and then it gets its full duration.
- **Custom ids.** If `id` is given and that toast exists, visible or queued, this updates it like `update(id, { message, type, duration })` and returns the same id. An `id` that doesn't exist yet becomes the new toast's id.
- **Duplicates.** Without an `id`, a toast with the **same message and type** as an existing one isn't added again. The existing toast's `count` goes up by one, its full duration restarts, and its id is returned.

### `update(id, { message?, type?, duration? })`

This changes a toast in place. It keeps its position, on screen or in the queue. It returns `false` for an unknown id.

- **Message only.** Changing just the message doesn't touch the timer.
- **Type or duration.** Changing the type, or giving a duration, restarts the timer with the full duration. When the type changes and no duration is given, the duration goes back to the new type's default. For example, a loading toast that becomes `'success'` gets the default 4000.

### `dismiss(id?)`

Removes one toast, or every toast when there's no id. An unknown id is ignored. When there's room on screen, queued toasts move up in order.

### `pause()` and `resume()`

These model hovering over the toasts:

- **`pause()`** freezes every visible timer.
- **`resume()`** carries on with each toast's **remaining** time.
- A toast that comes on screen while the toaster is paused waits for `resume()`.
- Calling either one twice in a row does nothing extra.

### `promise(p, { loading, success, error })`

This shows a new `'loading'` toast and returns its id. It is never merged with a duplicate.

- **Resolves.** The toast is updated to type `'success'` with the `success` message.
- **Rejects.** The toast is updated to type `'error'` with the `error` message.
- **Message functions.** Either message can be a function of the value or the reason.
- **Already gone.** If the toast was dismissed before the promise settled, nothing reappears.
