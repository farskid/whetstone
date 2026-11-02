Use the queue to build virtual timers.

```ts
class VirtualTimers {
  now(): number;   // starts at 0
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
  advance(ms: number): void;
}
```

- `setTimeout(cb, ms)` schedules `cb` at `now() + max(0, ms)` and returns a numeric id. `clearTimeout` cancels it; unknown or already-run ids are ignored.
- `advance(ms)` moves time forward to `now() + ms`, running every timer due at or before that time in order of due time, and for equal times in the order they were scheduled. While a callback runs, `now()` equals that timer's due time. After `advance` returns, `now()` is the target time.
- Timers scheduled by a callback that fall due within the same `advance` also run in it, including a `setTimeout(cb, 0)` (it runs at the current time, after the timers already due then).
- A callback can cancel other timers, and canceled timers don't run.
