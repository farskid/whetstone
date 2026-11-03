# Popover positioning: flip and shift

Add two middleware that keep the popover in view: `flip` moves it to another side, and `shift` slides it along the anchor.

```ts
computePosition(anchor, size, { placement: 'bottom', viewport, middleware: [offset(8), flip(), shift({ padding: 4 })] });
```

Both are factories returning `{ name, fn }`, named `'flip'` and `'shift'`. `padding` shrinks the viewport on every side, as in `detectOverflow`.

### `flip({ padding = 0, fallbackPlacements? })`

The candidates are `[initialPlacement, ...fallbackPlacements]`. By default `fallbackPlacements` is the opposite side with the same alignment, so `bottom-start` falls back to `top-start`. <!-- tests: fallbackPlacements replace the opposite side -->

For each candidate in turn:

1. **Check it.** Measure the overflow on the current placement's **own side** (`detectOverflow(...)[side]`). If it's `<= 0`, the placement fits and `flip` returns nothing. <!-- tests: flip moves to the opposite side when it overflows -->
2. **Record it.** Otherwise add `{ placement, overflow }` to `data.overflows`.
3. **Try the next one.** Reset to the next candidate.
4. **Best fit.** If no candidate fits, end on the candidate with the smallest recorded overflow. On a tie, take the earliest. If that means switching placement, reset to it once. Either way, `flip` must stop resetting. <!-- tests: when nothing fits, flip settles on the least overflow -->

### `shift({ padding = 0 })`

This slides the floating element along the cross axis so it stays inside the viewport, shrunk by `padding`. That's `x` for `top` and `bottom`, and `y` for `left` and `right`. If the element is too big to fit, it lines up with the start edge (left or top). The data is `{ x, y }`, the amount shifted. <!-- tests: shift slides along the cross axis -->

Everything from earlier stages still applies.
