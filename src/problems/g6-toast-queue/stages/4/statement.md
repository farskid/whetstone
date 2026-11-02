# Toast queue: promise toasts

Add a toast that follows a promise: it shows a loading message, then turns into success or error.

```ts
t.promise(save(), { loading: 'Saving…', success: 'Saved', error: (e) => `Failed: ${e}` });
```

## `promise(p, { loading, success, error })`

This shows a new `'loading'` toast and returns its id. It is never merged with a duplicate, even when another toast has the same loading message.

- **Resolves.** The toast is updated to type `'success'` with the `success` message, as `update` would do, so it gets the default duration.
- **Rejects.** The toast is updated to type `'error'` with the `error` message.
- **Message functions.** Either message can be a function of the value or the reason.
- **Already gone.** If the toast was dismissed before the promise settled, nothing reappears.

Everything from earlier stages still applies.
