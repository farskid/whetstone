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
  }

  static of(amount: bigint | number, currency: Currency): Money {
    throw new Error('Not implemented');
  }

  static fromDecimal(value: string, currency: Currency): Money {
    throw new Error('Not implemented');
  }

  add(other: Money): Money {
    throw new Error('Not implemented');
  }

  subtract(other: Money): Money {
    throw new Error('Not implemented');
  }

  isZero(): boolean {
    throw new Error('Not implemented');
  }

  compare(other: Money): -1 | 0 | 1 {
    throw new Error('Not implemented');
  }

  equals(other: Money): boolean {
    throw new Error('Not implemented');
  }

  toDecimal(): string {
    throw new Error('Not implemented');
  }

}
