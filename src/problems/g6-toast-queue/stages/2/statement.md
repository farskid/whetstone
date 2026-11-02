# Toast queue: queue and pause

Limit how many toasts are on screen, and let the user pause them by hovering.

```ts
const t = createToaster({ clock, maxVisible: 1 });
t.toast('a');
t.toast('b');
t.getQueued(); // [b]: its timer hasn't started
t.pause();     // a's timer freezes
t.resume();    // a carries on with the time it had left
```

## `createToaster({ clock, maxVisible = 3, duration = 4000 })`

- **`getQueued()`** returns copies of the waiting toasts, oldest first.
- **On screen.** A new toast is shown if fewer than `maxVisible` are on screen. Its timer starts then.
- **Queued.** Otherwise it waits in a FIFO queue. Its timer **doesn't start until it's shown**, and then it gets its full duration.
- **`dismiss(id?)`** can remove queued toasts too. `dismiss()` with no id clears the screen and the queue. When there's room on screen, queued toasts move up in order.

## `pause()` and `resume()`

- **`pause()`** freezes every visible timer.
- **`resume()`** carries on with each toast's **remaining** time.
- A toast that comes on screen while the toaster is paused waits for `resume()`, then gets its full duration.
- Calling either one twice in a row does nothing extra.

Everything from earlier stages still applies.
