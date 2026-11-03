Build a small fine-grained reactivity library like **Preact Signals** or **SolidJS**. Start with the two building blocks: `signal` holds a value, and `computed` derives one from other signals.

```ts
const a = signal(2), b = signal(3);
const sum = computed(() => a.value + b.value);
sum.value;      // 5
a.value = 10;
sum.value;      // 13
```

```ts
interface ReadonlySignal<T> { readonly value: T; peek(): T }
interface Signal<T> extends ReadonlySignal<T> { value: T }

function signal<T>(initial: T): Signal<T>;
function computed<T>(fn: () => T): ReadonlySignal<T>;
```

- **`signal(initial)`**: `.value` reads the current value and assigning `.value` updates it. `.peek()` reads it too. <!-- tests: signal reads and writes .value -->
- Assigning a value that is `Object.is`-equal to the current one (`NaN` to `NaN`, say) changes nothing.
- **`computed(fn)`**: `.value` (and `.peek()`) returns `fn()`'s result. `fn` may read signals and other computeds. <!-- tests: computed derives from signals -->
- **Lazy:** `fn` doesn't run until someone reads the computed. Creating it or writing to its signals doesn't call `fn`. <!-- tests: computed is lazy: fn does not run until read -->
- **Cached:** reading again calls `fn` again only if a signal or computed it read last time has changed since. Several writes between two reads cost at most one call. <!-- tests: computed is cached between reads -->
- What happens when `fn` throws or a computed reads itself comes later; you don't need to handle it yet.
- Everything lives in one file. Global state is fine, since each test gets a fresh copy of your module.
