Write `debounce(fn, wait, options)`, a small version of **lodash.debounce**. It turns a burst of calls into one call to `fn`.

```ts
const save = debounce((text: string) => api.save(text), 300);
input.addEventListener('input', (e) => save(e.target.value)); // saves once typing pauses for 300 ms
```

```ts
interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

interface DebounceOptions {
  clock?: Clock; // default: the global setTimeout / clearTimeout
}

function debounce<A extends unknown[]>(fn: (...args: A) => unknown, wait: number, options?: DebounceOptions): (...args: A) => void;
```

- A **burst** is a run of calls where each call comes less than `wait` ms after the previous one. A burst ends `wait` ms after its **last** call: every call restarts the timer. <!-- tests: a burst of calls fires once with the latest args | every call restarts the timer | separate bursts fire separately -->
- When the burst ends, call `fn` once with the **latest** arguments and the latest `this`. <!-- tests: a burst of calls fires once with the latest args | keeps `this` from the latest call -->
- Nothing runs synchronously, even when `wait` is 0. <!-- tests: wait 0 still runs on a timer, not synchronously -->
- Don't leave timers behind: no calls means no timer. <!-- tests: no calls means fn never runs and no timer is left -->
- Use `options.clock` for every timer. The tests pass a fake clock and move time by hand. <!-- tests: trailing: calls fn once, wait ms after the call -->
