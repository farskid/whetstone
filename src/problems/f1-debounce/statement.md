# Debounce

Write `debounce(fn, wait, options)`, a small version of **lodash.debounce**. It turns a burst of calls into one call to `fn`.

```ts
const save = debounce((text: string) => api.save(text), 300);
input.addEventListener('input', (e) => save(e.target.value)); // saves once typing pauses for 300 ms
```

## API

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

interface DebounceOptions {
  leading?: boolean;   // default false
  trailing?: boolean;  // default true
  clock?: Clock;       // default: the global setTimeout / clearTimeout
}

interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
  pending(): boolean;
}

function debounce<A extends unknown[]>(fn: (...args: A) => unknown, wait: number, options?: DebounceOptions): Debounced<A>;
```

## Rules

- A **burst** is a run of calls where each call comes less than `wait` ms after the previous one. A burst ends `wait` ms after its **last** call: every call restarts the timer.
- **Trailing** (the default): when the burst ends, call `fn` once with the **latest** arguments and the latest `this`.
- **Leading**: call `fn` right away (synchronously) on the **first** call of a burst. Later calls in the same burst don't call it again.
- With `leading: true, trailing: true`, a burst of one call runs `fn` **once** (leading only). A burst of two or more calls runs it twice: leading with the first call's arguments, trailing with the last call's.
- Nothing runs synchronously unless `leading` is on, even when `wait` is 0.
- `cancel()` drops any scheduled trailing call and ends the current burst, so the next call starts a fresh burst.
- `pending()` is `true` when a trailing call is scheduled and hasn't run yet.
- Use `options.clock` for every timer. The tests pass a fake clock and move time by hand.
