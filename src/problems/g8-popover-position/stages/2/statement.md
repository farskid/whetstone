# Popover positioning: pipeline and offset

Add the middleware pipeline, overflow detection and the first middleware, `offset`.

```ts
computePosition(anchor, size, { placement: 'top', viewport, middleware: [offset(8)] });
// 8 px further up, with middlewareData.offset = { x: 0, y: -8 }
```

## `computePosition(reference, floating, { placement, middleware = [], viewport, rtl })`

This works out the coordinates for `placement` as before, then runs each middleware's `fn(state)` in order. `state` has these fields:

```ts
{ x, y, placement, initialPlacement, rects: { reference, floating }, viewport, rtl, middlewareData }
```

`rects.floating` is `{ x: 0, y: 0, width, height }`. A middleware may return `{ x?, y?, data?, reset? }`:

- **`x` and `y`** replace the current coordinates. The next middleware sees them.
- **`data`** is shallow-merged into `middlewareData[name]`. Every middleware that ran gets an entry, even an empty one.
- **`reset: true` or `reset: { placement }`** changes the placement if one is given. It then works out the coordinates again and **restarts the pipeline from the first middleware**. `middlewareData` is kept across restarts.

**Resets are capped.** After 50 resets, further `reset`s are ignored and the pipeline just continues.

The result is `{ x, y, placement, middlewareData }`.

## `detectOverflow(state, { padding = 0 })`

This returns how far the floating element, at `state.x`/`state.y`, sticks out past each edge of the viewport, as `{ top, right, bottom, left }`. Positive means overflowing, and negative means there's room to spare. `padding` shrinks the viewport on every side.

## Middleware

Each factory returns `{ name, fn }`. The name is the factory's own name.

### `offset(n | { mainAxis = 0, crossAxis = 0 })`

- **`mainAxis`** pushes the floating element away from the reference. A plain number means `mainAxis`.
- **`crossAxis`** moves it along the other axis, right or down. For `top` and `bottom` in RTL, it moves left.
- **Data:** `{ x, y }`, the amount actually moved.

Everything from earlier stages still applies.
