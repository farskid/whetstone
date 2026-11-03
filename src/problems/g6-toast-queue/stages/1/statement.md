# Toast queue

Toasts are the small notifications that pop up in a corner and fade away. The tricky part is managing them: how many show at once, when their timers run, and what happens when the same message fires five times. Here you'll build that manager, the way **sonner** does, with an injected `clock` (`now`, `setTimeout`, `clearTimeout`).

This stage covers showing toasts and dismissing them.

```ts
const t = createToaster({ clock });
const id = t.toast('Saved');
t.getVisible(); // [{ id, message: 'Saved', type: 'default', duration: 4000, count: 1 }]
// 4000 ms later the toast is gone
```

## `createToaster({ clock, duration = 4000 })`

A toast looks like `{ id, message, type, duration, count }`. Its `type` is `'default' | 'success' | 'error' | 'info' | 'loading'`. In this stage `count` is always `1`.

- **`getVisible()`** returns copies of the toasts on screen, oldest first. Every toast is on screen in this stage.

### `toast(message, { type = 'default', duration? })`

This adds a toast and returns its new, unique id:

- **Duration.** A toast without an explicit `duration` gets the toaster's default. `'loading'` toasts default to `Infinity`. A toast with an `Infinity` duration never auto-dismisses.
- **Timer.** The toast's timer starts right away, and it dismisses itself after `duration` ms. <!-- tests: toasts dismiss themselves after their duration -->

### `dismiss(id?)`

Removes one toast, or every toast when there's no id. An unknown id is ignored. A dismissed toast's timer is cleared, so no timers are left behind. <!-- tests: dismiss one, all, or an unknown id -->
