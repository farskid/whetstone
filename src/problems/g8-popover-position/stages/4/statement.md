# Popover positioning: arrow and autoPlacement

Add an arrow that points at the anchor, and a middleware that picks the side with the most room.

```ts
computePosition(anchor, size, { viewport, middleware: [autoPlacement(), offset(8), shift(), arrow({ size: 10, padding: 4 })] });
// middlewareData.arrow = { x, centerOffset } (or { y, centerOffset } on the left and right)
```

They are named `'arrow'` and `'autoPlacement'`.

### `arrow({ size, padding = 0 })`

This positions an arrow of `size` px along the floating element's cross axis, pointing at the centre of the reference. The position is measured from the floating element's left edge (or top edge for `left` and `right`):

- The arrow's centre should line up with the reference's centre. <!-- tests: the arrow points at the reference, clamped -->
- It's clamped to `[padding, length − size − padding]`. <!-- tests: the arrow points at the reference, clamped -->
- The data is `{ x }` (or `{ y }`) and `centerOffset`, which is how far the clamp moved it, as `ideal − clamped`.

Run it after `shift`.

### `autoPlacement({ alignment?, allowedSides = ['top', 'right', 'bottom', 'left'] })`

This picks the allowed side with the most room between the reference and that edge of the viewport. On a tie, take the earliest in `allowedSides`. It adds the alignment if one is given. If that's not the current placement, it resets to it. <!-- tests: autoPlacement picks the side with the most room -->

Everything from earlier stages still applies.
