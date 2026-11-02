# Money math: allocation

Add `allocate(ratios)`. It splits the amount into `ratios.length` parts in proportion to the ratios, and the parts always add up to exactly the original amount.

```ts
Money.fromDecimal('100.00', USD).allocate([1, 1, 1]).map((m) => m.toDecimal()); // ['33.34', '33.33', '33.33']
Money.fromDecimal('0.05', USD).allocate([70, 30]).map((m) => m.toDecimal());    // ['0.04', '0.01']
```

```ts
allocate(ratios: number[]): Money[]
```

1. Each part gets `floor(|amount| × ratio / sum)` minor units.
2. The leftover units are handed out one at a time, starting from the first part. Parts whose ratio is `0` are skipped and always stay at zero.
3. A negative amount is split as its absolute value and then negated, so `-100.00` gives `-33.34`, `-33.33` and `-33.33`.

- Ratios must be non-negative integers, and at least one must be positive. An empty list, all zeros, a negative ratio or a fractional ratio throws a `RangeError`.
- The parts keep the receiver's currency and work for amounts of any size.

Everything from earlier stages still applies.
