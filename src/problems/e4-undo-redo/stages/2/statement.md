Add **coalescing**, so a burst of typing is one undo step, and a **capacity** limit.

```ts
const h = createHistory('', { clock });
h.push('h', { groupKey: 'typing' });
h.push('hi', { groupKey: 'typing' });   // within 500 ms: same step
h.undo();                               // h.state === ''
```

```ts
interface Clock { now(): number }
interface HistoryOptions { capacity?: number; coalesceMs?: number; clock?: Clock }
interface PushOptions { groupKey?: string }

function createHistory<S>(initial: S, options?: HistoryOptions): History<S>;
// History.push(state: S, options?: PushOptions): void
```

- `coalesceMs` defaults to `500`. `clock` defaults to `Date.now`.
- A push **replaces the present** instead of adding an undo step when all of these hold: <!-- tests: pushes with the same groupKey within the window coalesce -->
  - it has a `groupKey`;
  - the previous push had the **same** `groupKey`;
  - at most `coalesceMs` passed since that previous push (exactly `coalesceMs` still counts).

  The gap is measured from the previous push, not the first one in the group. One undo then goes back to before the whole group. A coalesced push still clears redo.
- A push without a `groupKey` never coalesces, and the push after it doesn't coalesce with anything before it. <!-- tests: different keys, no key, undo and the exact boundary -->
- `undo` and `redo` break coalescing: the next push always starts a new step. <!-- tests: different keys, no key, undo and the exact boundary -->
- **Capacity:** at most `capacity` undo steps are kept (default: unlimited). When there are more, the oldest are dropped first. <!-- tests: capacity drops the oldest steps -->
