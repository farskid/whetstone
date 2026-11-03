Add tap ordering and interceptors to every hook.

```ts
type TapOptions = string | { name: string; stage?: number; before?: string | string[] };
interface TapInfo { name: string; type: 'sync' | 'promise'; stage: number; fn: Function }
interface Interceptor { call?(...args: any[]): void; tap?(tap: TapInfo): void }

// every hook, plus:
intercept(interceptor: Interceptor): void;
```

**Ordering**
- Taps run in ascending `stage` (default 0). Taps with the same stage run in registration order. <!-- tests: stage orders taps; equal stages keep registration order -->
- `before: 'x'` or `before: ['x', 'y']` places the new tap just before the earliest of the named taps already registered, if that is earlier than its stage position. Names that aren't registered (yet) are ignored. <!-- tests: before places a tap ahead of named taps; unknown names are ignored -->

**Interceptors**
- `call(...args)` runs once at the start of each call, before any tap. <!-- tests: interceptors see each call and each tap, in order -->
- `tap(tapInfo)` runs just before each tap runs. `type` is `'sync'` for `tap` and `'promise'` for `tapPromise`. <!-- tests: interceptors see each call and each tap, in order -->
- Interceptors run in the order they were added. An interceptor added after some taps still sees them. <!-- tests: interceptors see each call and each tap, in order -->
