# Money math

Floating-point numbers can't hold money: `0.1 + 0.2` is `0.30000000000000004`. Libraries like **dinero.js** store an integer count of the currency's **minor units** (cents for USD) and do every operation exactly. This stage builds that value object.

```ts
const a = Money.fromDecimal('0.10', USD);
a.add(Money.fromDecimal('0.20', USD)).toDecimal(); // '0.30'
Money.of(-5, USD).toDecimal();                     // '-0.05'
a.add(Money.of(1, EUR));                           // throws CurrencyMismatchError
```

```ts
interface Currency { code: string; exponent: number } // exponent = digits after the decimal point
USD, EUR // exponent 2
JPY      // exponent 0
KWD      // exponent 3

class Money {
  readonly amount: bigint; readonly currency: Currency;
  static of(minor: bigint | number, currency: Currency): Money;
  static fromDecimal(value: string, currency: Currency): Money;
  add(m: Money): Money; subtract(m: Money): Money;
  compare(m: Money): -1 | 0 | 1; equals(m: Money): boolean; isZero(): boolean;
  toDecimal(): string;
}
```

Two amounts have the same currency when their `code`s are equal.

**`Money` is immutable.** Every operation returns a new instance and never changes the receiver.

**Creating a value**
- `Money.of(minor, currency)` takes an integer count of minor units, as a `bigint` or a safe-integer `number`. Any other number (`1.5`, `NaN`, `2 ** 60`) throws a `RangeError`.
- `Money.fromDecimal(str, currency)` parses a plain decimal in major units: `"12.34"`, `"-0.5"` or `"7"`. It throws a `RangeError` when the string has more decimal places than the currency allows, or isn't a plain decimal (`"12,50"`). It never rounds, and it parses the digits exactly instead of going through floats.

**Reading a value**
- `amount` is the minor units as a `bigint`, and `currency` is the currency.
- `toDecimal()` returns the exact amount in major units with exactly `exponent` decimals: `"12.30"`, `"-0.05"`, `"100"` (JPY), `"1.500"` (KWD).

**Arithmetic**
- `add(m)` and `subtract(m)` are exact for amounts of any size, including amounts beyond 2^53.
- `add`, `subtract` and `compare` throw `CurrencyMismatchError` (exported) when the currencies differ.
- `compare(m)` returns `-1`, `0` or `1`.
- `equals(m)` is `true` when the currency and amount both match. It never throws.
- `isZero()` reports whether the amount is zero.
