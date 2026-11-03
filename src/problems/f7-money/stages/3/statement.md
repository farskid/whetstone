# Money math: multiply and round

Add `multiply(factor, mode = 'half-even')`.

```ts
Money.fromDecimal('100.00', USD).multiply(1.075).toDecimal();        // '107.50'
Money.fromDecimal('1.00', USD).multiply(1.005, 'half-up').toDecimal(); // '1.01'
Money.of(100, JPY).multiply('1.085').toDecimal();                    // '108'
```

```ts
type RoundingMode = 'half-even' | 'half-up' | 'floor' | 'ceil';
multiply(factor: number | string, mode?: RoundingMode): Money
```

`factor` is a `number` or a numeric string. Use its **exact decimal** value: a factor of `1.005` means exactly 1.005, not the nearest binary double. Multiply exactly, then round the result to whole minor units of the currency: <!-- tests: factors are exact decimals, not binary doubles -->

| mode | rounds to |
| --- | --- |
| `half-even` | nearest, ties to the even neighbour (banker's rounding) <!-- tests: rounding modes on exact ties --> |
| `half-up` | nearest, ties away from zero <!-- tests: rounding modes on exact ties --> |
| `floor` | toward −∞ <!-- tests: rounding modes on exact ties --> |
| `ceil` | toward +∞ <!-- tests: rounding modes on exact ties --> |

- The default mode is `half-even`.
- This works the same for 0-decimal (JPY) and 3-decimal (KWD) currencies. <!-- tests: currencies with 0 and 3 decimals -->
- A non-finite factor (`Infinity`, `NaN`) or an unknown mode throws a `RangeError`.

Everything from earlier stages still applies.
