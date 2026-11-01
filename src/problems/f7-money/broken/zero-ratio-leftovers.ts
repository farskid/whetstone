// Bug: zero-ratio parts can receive leftover cents
export interface Currency {
  code: string;
  /** Number of minor-unit digits: 2 for USD, 0 for JPY, 3 for KWD. */
  exponent: number;
}

export const USD: Currency = { code: 'USD', exponent: 2 };
export const EUR: Currency = { code: 'EUR', exponent: 2 };
export const JPY: Currency = { code: 'JPY', exponent: 0 };
export const KWD: Currency = { code: 'KWD', exponent: 3 };

export type RoundingMode = 'half-even' | 'half-up' | 'floor' | 'ceil';

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`Currency mismatch: ${a.code} and ${b.code}`);
    this.name = 'CurrencyMismatchError';
  }
}

const pow10 = (n: number) => 10n ** BigInt(n);

/** Divide n by d (d > 0) and round the quotient to an integer. */
function divRound(n: bigint, d: bigint, mode: RoundingMode): bigint {
  const q = n / d;
  const r = n % d;
  if (r === 0n) return q;
  const neg = n < 0n;
  const away = neg ? q - 1n : q + 1n;
  const twice = (r < 0n ? -r : r) * 2n;
  switch (mode) {
    case 'floor': return neg ? q - 1n : q;
    case 'ceil': return neg ? q : q + 1n;
    case 'half-up': return twice >= d ? away : q;
    case 'half-even':
      if (twice > d) return away;
      if (twice < d) return q;
      return q % 2n === 0n ? q : away;
    default: throw new RangeError(`Unknown rounding mode: ${String(mode)}`);
  }
}

/** An exact decimal number or numeric string as a fraction num / den. */
function toFraction(value: number | string): { num: bigint; den: bigint } {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError(`Not a finite number: ${value}`);
  const s = String(value).trim();
  const m = /^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(s) ?? /^([+-]?)()\.(\d+)(?:e([+-]?\d+))?$/i.exec(s);
  if (!m) throw new RangeError(`Not a decimal number: ${s}`);
  const frac = m[3] ?? '';
  let num = BigInt((m[2] || '0') + frac);
  let den = pow10(frac.length);
  const exp = Number(m[4] ?? 0);
  if (exp > 0) num *= pow10(exp);
  else if (exp < 0) den *= pow10(-exp);
  if (m[1] === '-') num = -num;
  return { num, den };
}

function assertMode(mode: RoundingMode) {
  if (!['half-even', 'half-up', 'floor', 'ceil'].includes(mode)) throw new RangeError(`Unknown rounding mode: ${String(mode)}`);
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

  multiply(factor: number | string, mode: RoundingMode = 'half-even'): Money {
    assertMode(mode);
    const { num, den } = toFraction(factor);
    return new Money(divRound(this.amount * num, den, mode), this.currency);
  }

  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) throw new RangeError('allocate needs at least one ratio');
    for (const r of ratios) if (!Number.isSafeInteger(r) || r < 0) throw new RangeError(`Ratios must be non-negative integers, got ${r}`);
    const total = ratios.reduce((a, b) => a + BigInt(b), 0n);
    if (total === 0n) throw new RangeError('At least one ratio must be positive');
    const neg = this.amount < 0n;
    const abs = neg ? -this.amount : this.amount;
    const shares = ratios.map((r) => (abs * BigInt(r)) / total);
    let remainder = abs - shares.reduce((a, b) => a + b, 0n);
    for (let i = 0; remainder > 0n; i++) {
      shares[i] += 1n;
      remainder -= 1n;
    }
    return shares.map((s) => new Money(neg ? -s : s, this.currency));
  }

  /** Convert with a rate in major units: 1 unit of this currency = `rate` units of `to`. */
  convert(to: Currency, rate: number | string, mode: RoundingMode = 'half-even'): Money {
    assertMode(mode);
    const { num, den } = toFraction(rate);
    if (num <= 0n) throw new RangeError(`Rate must be positive, got ${rate}`);
    return new Money(divRound(this.amount * num * pow10(to.exponent), den * pow10(this.currency.exponent), mode), to);
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

  format(locale: string): string {
    const e = this.currency.exponent;
    const nf = new Intl.NumberFormat(locale, { style: 'currency', currency: this.currency.code, minimumFractionDigits: e, maximumFractionDigits: e });
    return nf.format(this.toDecimal() as unknown as number);
  }
}
