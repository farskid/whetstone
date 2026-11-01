# Money math

Floating-point numbers can't hold money: `0.1 + 0.2` is `0.30000000000000004`. Libraries like **dinero.js** store an integer count of the currency's **minor units** (cents for USD) and do every operation exactly.

```ts
const price = Money.fromDecimal('100.00', USD);
price.allocate([1, 1, 1]).map((m) => m.toDecimal()); // ['33.34', '33.33', '33.33']
price.multiply(1.075).toDecimal();                    // '107.50'
price.convert(JPY, 151.237).toDecimal();              // '15124'
price.format('de-DE');                                // '100,00 $'
```

## Currencies

```ts
interface Currency { code: string; exponent: number } // exponent = digits after the decimal point
USD, EUR // exponent 2
JPY      // exponent 0
KWD      // exponent 3
```

Two amounts have the same currency when their `code`s are equal.

## `Money`

`Money` is immutable. Every operation returns a new instance and never changes the receiver.

- **`Money.of(minor, currency)`** creates a value from an integer count of minor units, given as a `bigint` or a safe-integer `number`. Any other number (`1.5`, `NaN`, `2 ** 60`) throws a `RangeError`.
- **`Money.fromDecimal(str, currency)`** parses `"12.34"`, `"-0.5"` or `"7"`. If the string has more decimal places than the currency allows, or isn't a plain decimal, it throws a `RangeError`. It never rounds silently.
- **`amount`** is the minor units as a `bigint`. **`currency`** is the currency.
- **`toDecimal()`** returns the exact amount in major units with exactly `exponent` decimals: `"12.30"`, `"-0.05"`, `"100"` (JPY), `"1.500"` (KWD).
- **`add(m)` and `subtract(m)`** are exact for amounts of any size. They throw `CurrencyMismatchError` (exported) when the currencies differ, and so does **`compare(m)`**, which returns `-1`, `0` or `1`.
- **`equals(m)`** is `true` when the currency and amount are both the same. It never throws.
- **`isZero()`** reports whether the amount is zero.

## `allocate(ratios)`

Splits the amount into `ratios.length` parts in proportion to the ratios. The parts always add up to exactly the original amount.

1. Each part gets `floor(|amount| × ratio / sum)` minor units.
2. The leftover units are handed out one at a time, starting from the first part. Parts whose ratio is `0` are skipped and always stay at zero.
3. A negative amount is split as its absolute value and then negated, so `-100.00` gives `-33.34`, `-33.33` and `-33.33`.

Ratios must be non-negative integers, and at least one must be positive. Otherwise `allocate` throws a `RangeError`.

## `multiply(factor, mode = 'half-even')`

`factor` is a `number` or a numeric string. Use its exact decimal value: a factor of `1.005` means exactly 1.005, not the nearest binary double. Multiply exactly, then round the result to whole minor units:

| mode | rounds to |
| --- | --- |
| `half-even` | nearest, ties to the even neighbour (banker's rounding) |
| `half-up` | nearest, ties away from zero |
| `floor` | toward −∞ |
| `ceil` | toward +∞ |

A non-finite factor, or an unknown mode, throws a `RangeError`.

## `convert(to, rate, mode = 'half-even')`

`rate` says how many major units of `to` one major unit of this currency is worth. It can be a number or a string, and it must be positive. Compute the converted amount exactly, then round it to `to`'s minor units with `mode`. For example, `1000` JPY at `0.0066` is `"6.60"` USD.

## `format(locale)`

Returns `Intl.NumberFormat(locale, { style: 'currency', currency: code })` output, showing exactly `exponent` fraction digits.
