# Virtual list: scroll anchoring and scrollToIndex

When a row above the viewport is measured, everything below it moves, and the visible content would jump. `measure` now tells the caller how far to adjust `scrollTop`. Add `scrollToIndex` too.

```ts
v.measure(3, 80, 500);  // row 3 starts above the viewport and grew by 30 → 30
v.scrollToIndex(500, { align: 'center', scrollTop: 1000 }); // → scrollTop to set
```

## API changes

```ts
measure(index: number, size: number, scrollTop?: number): number;
scrollToIndex(index: number, opts?: { align?: 'start' | 'center' | 'end' | 'auto'; scrollTop?: number }): number;
```

## Rules

**`measure(index, size, scrollTop = 0)`**
- Records the real size, as before.
- Returns the **scroll adjustment**: `newSize - oldSize` when the row **starts above** the viewport (`start < scrollTop`, using the row's start before the change), otherwise `0`. A row that starts exactly at `scrollTop` is not above. Out-of-range indexes return `0`. <!-- tests: measure() returns a scroll adjustment only for rows starting above the viewport -->

**`scrollToIndex(index, { align = 'auto', scrollTop = 0 })`** returns the new scrollTop:
- `start`: the row's start is at the top. <!-- tests: scrollToIndex: start / end / center -->
- `end`: the row's end is at the bottom. <!-- tests: scrollToIndex: start / end / center -->
- `center`: the row's middle is in the middle. <!-- tests: scrollToIndex: start / end / center -->
- `auto`: if the row is fully visible in `[scrollTop, scrollTop + viewportHeight]`, keep `scrollTop`. If it starts above, use `start`. Otherwise use `end`. <!-- tests: scrollToIndex auto: only scrolls if needed, by the minimum amount -->
- Clamp `index` to `[0, count - 1]`, and clamp the result to `[0, max(0, total - viewportHeight)]`.
- An empty list returns `0`.
- Positions use measured sizes. <!-- tests: scrollToIndex uses measured sizes -->

Everything from earlier stages still applies.
