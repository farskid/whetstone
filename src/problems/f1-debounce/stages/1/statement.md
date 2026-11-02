Write `debounce(fn, wait, options)`, a small version of **lodash.debounce**. It turns a burst of calls into one call to `fn`.

```ts
const save = debounce((text: string) => api.save(text), 300);
input.addEventListener('input', (e) => save(e.target.value)); // saves once typing pauses for 300 ms
```

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

interface DebounceOptions {
  clock?: Clock; // default: the global setTimeout / clearTimeout
}

function debounce<A extends unknown[]>(fn: (...args: A) => unknown, wait: number, options?: DebounceOptions): (...args: A) => void;
```

- A **burst** is a run of calls where each call comes less than `wait` ms after the previous one. A burst ends `wait` ms after its **last** call: every call restarts the timer.
- When the burst ends, call `fn` once with the **latest** arguments and the latest `this`.
- Nothing runs synchronously, even when `wait` is 0.
- Don't leave timers behind: no calls means no timer.
- Use `options.clock` for every timer. The tests pass a fake clock and move time by hand.
