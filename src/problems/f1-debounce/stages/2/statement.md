Add two options:

```ts
interface DebounceOptions {
  leading?: boolean;   // default false
  trailing?: boolean;  // default true
  clock?: Clock;
}
```

- **Leading**: call `fn` right away (synchronously) on the **first** call of a burst. Later calls in the same burst don't call it again. <!-- tests: leading only: fires immediately, once per burst | leading only: a new burst fires again -->
- **Trailing** is the stage-1 behaviour. It is on by default: `trailing: undefined` (or leaving it out) counts as `true`. Only an explicit `trailing: false` turns it off. <!-- tests: trailing undefined (or left out) counts as true -->
- Likewise `leading` is off unless it is `true`: `leading: undefined` counts as `false`.
- With `leading: true, trailing: true`, a burst of one call runs `fn` **once** (leading only). A burst of two or more calls runs it twice: leading with the first call's arguments, trailing with the last call's. <!-- tests: leading + trailing, single call: fires once | leading + trailing, burst: first args now, last args at the end -->
- Nothing runs synchronously unless `leading` is on. <!-- tests: wait 0 still runs on a timer, not synchronously -->
