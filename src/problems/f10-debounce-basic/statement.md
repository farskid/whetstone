# Debounce (basic)

**Warm-up, about 5 minutes.**

Write `debounce(fn, wait, clock)`. It returns a new function. Calling that function doesn't call `fn` right away. Instead, `fn` runs once there have been `wait` ms with no further calls.

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

function debounce<A extends unknown[]>(fn: (...args: A) => unknown, wait: number, clock?: Clock): (...args: A) => void;
```

## Rules

- Every call **restarts** the timer.
- When `wait` ms pass with no calls, call `fn` **once** with the **latest** arguments and the latest `this`.
- Never call `fn` synchronously, even when `wait` is 0.
- After `fn` runs, the next call starts over.
- Use `clock` for the timer when it's given, otherwise the global `setTimeout` / `clearTimeout`. The tests pass a fake clock and move time by hand.
