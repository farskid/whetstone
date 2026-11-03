# Form state manager: debounce and submit

Add debounced async checks, `isValidating`, and `submit`.

```ts
const form = createForm({
  initialValues: { email: '' },
  fields: { email: { asyncValidate: checkTaken, debounceMs: 300 } },
  clock,
});
form.setValue('email', 'a@b.c'); // check starts 300 ms later
const { ok, errors } = await form.submit(save);
```

```ts
interface Clock { now(): number; setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void }
// FieldConfig gains: debounceMs?: number
// options gain:      clock?: Clock   (default: the real timers)
// Form gains:        readonly isValidating: boolean;
//                    submit(onSubmit?: (values: Values) => unknown): Promise<{ ok: boolean; errors: Errors }>
```

- `setValue` on an async field starts its check after `debounceMs` on the `clock`, or immediately if it is 0 or unset. A newer `setValue` on the same path cancels the pending timer. <!-- tests: async checks are debounced on the clock -->
- `isValidating` is true while any check is debouncing or in flight. <!-- tests: async checks are debounced on the clock -->
- `submit(onSubmit?)`: <!-- tests: submit flushes debounces, waits for checks, touches fields and calls onSubmit only when valid -->
  1. Touches every path in `values` that has a field config.
  2. Runs any debouncing checks immediately, cancelling their timers.
  3. Starts checks for async fields that have no result and no check running.
  4. Waits until no checks are pending.
  5. If the form is valid, awaits `onSubmit(values)`.
  It resolves to `{ ok, errors }`. `onSubmit` is never called when the form is invalid. <!-- tests: submit flushes debounces, waits for checks, touches fields and calls onSubmit only when valid -->
- `reset` also cancels pending timers.
- Everything from earlier stages still applies.
