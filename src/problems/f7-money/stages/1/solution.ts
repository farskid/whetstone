import type { Currency } from './types';

export const USD: Currency = { code: 'USD', exponent: 2 };
export const EUR: Currency = { code: 'EUR', exponent: 2 };
export const JPY: Currency = { code: 'JPY', exponent: 0 };
export const KWD: Currency = { code: 'KWD', exponent: 3 };

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`Currency mismatch: ${a.code} and ${b.code}`);
    this.name = 'CurrencyMismatchError';
  }
}

export class Money {
  /** Integer amount in minor units (cents for USD). */
  readonly amount: bigint;
  readonly currency: Currency;

  private constructor(amount: bigint, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }

  /** From an integer number of minor units. */
  static of(amount: bigint | number, currency: Currency): Money {
    if (typeof amount === 'number') {
      if (!Number.isSafeInteger(amount)) throw new RangeError(`Minor units must be a safe integer, got ${amount}`);
      return new Money(BigInt(amount), currency);
    }
    if (typeof amount !== 'bigint') throw new RangeError('Minor units must be an integer');
    return new Money(amount, currency);
  }

  /** From a decimal string in major units, like "12.34". */
  static fromDecimal(value: string, currency: Currency): Money {
    const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
    if (!m) throw new RangeError(`Not a decimal amount: ${value}`);
    const frac = m[3] ?? '';
    if (frac.length > currency.exponent) throw new RangeError(`${currency.code} has ${currency.exponent} decimal places, got "${value}"`);
    const minor = BigInt(m[2] + frac.padEnd(currency.exponent, '0'));
    return new Money(m[1] === '-' ? -minor : minor, currency);
  }

  private check(other: Money) {
    if (other.currency.code !== this.currency.code) throw new CurrencyMismatchError(this.currency, other.currency);
  }

  add(other: Money): Money {
    this.check(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.check(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  isZero(): boolean {
    return this.amount === 0n;
  }

  compare(other: Money): -1 | 0 | 1 {
    this.check(other);
    return this.amount < other.amount ? -1 : this.amount > other.amount ? 1 : 0;
  }

  equals(other: Money): boolean {
    return other.currency.code === this.currency.code && other.amount === this.amount;
  }

  /** Exact decimal string in major units: "12.34", "-0.05", "100" for JPY. */
  toDecimal(): string {
    const e = this.currency.exponent;
    const neg = this.amount < 0n;
    const digits = (neg ? -this.amount : this.amount).toString().padStart(e + 1, '0');
    const int = digits.slice(0, digits.length - e);
    const frac = digits.slice(digits.length - e);
    return (neg ? '-' : '') + int + (e > 0 ? '.' + frac : '');
  }

}
