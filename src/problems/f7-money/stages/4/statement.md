# Money math: convert and format

Add currency conversion and locale formatting.

```ts
Money.fromDecimal('100.00', USD).convert(JPY, 151.237).toDecimal(); // '15124'
Money.of(1000, JPY).convert(USD, '0.0066').toDecimal();             // '6.60'
Money.fromDecimal('100.00', USD).format('de-DE');                   // '100,00 $'
```

```ts
convert(to: Currency, rate: number | string, mode?: RoundingMode): Money
format(locale: string): string
```

**`convert(to, rate, mode = 'half-even')`**
- `rate` is how many major units of `to` one major unit of this currency is worth. It can be a number or a string, and it is used as an exact decimal, like `multiply`'s factor.
- Compute the converted amount exactly, then round it to `to`'s minor units with `mode`. The currencies can have different exponents. <!-- tests: convert between currencies with different exponents -->
- The result has currency `to`.
- A rate that isn't positive throws a `RangeError`, and so does an unknown mode.

**`format(locale)`** returns the output of `Intl.NumberFormat(locale, { style: 'currency', currency: code })`, with exactly `exponent` fraction digits, for example 0 for JPY and 3 for KWD. <!-- tests: format uses Intl with the currency's decimals -->

Everything from earlier stages still applies.
