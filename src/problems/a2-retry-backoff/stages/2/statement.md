Make the wait grow.

```ts
interface RetryOptions {
  // ...stage 1, plus:
  factor?: number;       // default 2
  maxTimeout?: number;   // default Infinity
  randomize?: boolean;   // default false (full jitter)
  random?: () => number; // default Math.random, returns [0, 1)
}
```

- Before retry number `n` (n = 1 for the wait after the first failure), wait `min(maxTimeout, minTimeout * factor ** (n - 1))` ms. <!-- tests: waits minTimeout * factor^(n-1) between attempts | does not call fn again before the wait is over | waits are capped at maxTimeout -->
- With `randomize: true`, multiply that capped value by `random()`. <!-- tests: randomize multiplies the capped wait by random() -->
