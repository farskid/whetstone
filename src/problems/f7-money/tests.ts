import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Value object';
const G2 = 'Allocation';
const G3 = 'Multiply and round';
const G4 = 'Convert and format';

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'minor units, decimal parsing and exact decimal output',
    run({ Money, USD, JPY, KWD }, { expect }) {
      expect(Money.of(1234, USD).toDecimal()).toBe('12.34');
      expect(Money.of(-5, USD).toDecimal(), 'small negative keeps its leading zero').toBe('-0.05');
      expect(Money.fromDecimal('12.3', USD).amount).toBe(1230n);
      expect(Money.fromDecimal('7', USD).toDecimal()).toBe('7.00');
      expect(Money.fromDecimal('-0.5', USD).amount).toBe(-50n);
      expect(Money.of(100, JPY).toDecimal(), 'JPY has no decimals').toBe('100');
      expect(Money.fromDecimal('1.5', KWD).toDecimal(), 'KWD has three').toBe('1.500');
      expect(Money.of(0, USD).isZero()).toBe(true);
    },
  },
  {
    group: G1,
    title: 'add and subtract are exact, immutable, and work beyond 2^53',
    run({ Money, USD }, { expect }) {
      const a = Money.fromDecimal('0.10', USD);
      const b = Money.fromDecimal('0.20', USD);
      expect(a.add(b).toDecimal(), '0.1 + 0.2').toBe('0.30');
      expect(a.subtract(b).toDecimal()).toBe('-0.10');
      expect(a.toDecimal(), 'receiver unchanged').toBe('0.10');
      const huge = Money.of(2n ** 70n, USD);
      expect(huge.add(Money.of(1, USD)).amount).toBe(2n ** 70n + 1n);
      expect(huge.add(huge).toDecimal()).toBe('23611832414348226068.48');
    },
  },
  {
    group: G1,
    title: 'mixing currencies throws CurrencyMismatchError; equals never throws',
    run({ Money, USD, EUR, CurrencyMismatchError }, { expect }) {
      const usd = Money.of(100, USD);
      const eur = Money.of(100, EUR);
      expect(thrown(() => usd.add(eur)) instanceof CurrencyMismatchError, 'add').toBe(true);
      expect(thrown(() => usd.subtract(eur)) instanceof CurrencyMismatchError, 'subtract').toBe(true);
      expect(thrown(() => usd.compare(eur)) instanceof CurrencyMismatchError, 'compare').toBe(true);
      expect(usd.equals(eur)).toBe(false);
      expect(usd.equals(Money.fromDecimal('1.00', USD))).toBe(true);
      expect(usd.compare(Money.of(99, USD))).toBe(1);
      expect(usd.compare(Money.of(101, USD))).toBe(-1);
      expect(usd.compare(Money.of(100, USD))).toBe(0);
    },
  },
  {
    group: G1,
    title: 'invalid amounts throw RangeError instead of rounding',
    run({ Money, USD, JPY }, { expect }) {
      expect(thrown(() => Money.of(1.5, USD)) instanceof RangeError, 'fractional minor units').toBe(true);
      expect(thrown(() => Money.of(NaN, USD)) instanceof RangeError, 'NaN').toBe(true);
      expect(thrown(() => Money.of(2 ** 60, USD)) instanceof RangeError, 'unsafe integer number').toBe(true);
      expect(thrown(() => Money.fromDecimal('1.234', USD)) instanceof RangeError, 'too many decimals').toBe(true);
      expect(thrown(() => Money.fromDecimal('1.5', JPY)) instanceof RangeError, 'JPY has no cents').toBe(true);
      expect(thrown(() => Money.fromDecimal('12,50', USD)) instanceof RangeError, 'not a decimal').toBe(true);
      expect(Money.fromDecimal('0.29', USD).amount, 'parsed exactly, not via floats').toBe(29n);
      expect(Money.fromDecimal('1.15', USD).amount).toBe(115n);
    },
  },
  {
    group: G2,
    title: 'allocate splits with no lost cents',
    run({ Money, USD }, { expect }) {
      const parts = (s: string, r: number[]) => Money.fromDecimal(s, USD).allocate(r).map((m) => m.toDecimal());
      expect(parts('100.00', [1, 1, 1])).toEqual(['33.34', '33.33', '33.33']);
      expect(parts('0.05', [70, 30])).toEqual(['0.04', '0.01']);
      expect(parts('100.00', [1, 3])).toEqual(['25.00', '75.00']);
      expect(parts('0.02', [1, 1, 1])).toEqual(['0.01', '0.01', '0.00']);
    },
  },
  {
    group: G2,
    title: 'negative amounts and zero ratios',
    run({ Money, USD }, { expect }) {
      const parts = (s: string, r: number[]) => Money.fromDecimal(s, USD).allocate(r).map((m) => m.toDecimal());
      expect(parts('-100.00', [1, 1, 1])).toEqual(['-33.34', '-33.33', '-33.33']);
      expect(parts('1.01', [0, 1, 1]), 'zero-ratio parts never get leftovers').toEqual(['0.00', '0.51', '0.50']);
      expect(parts('-0.03', [1, 0, 1])).toEqual(['-0.02', '0.00', '-0.01']);
      const big = Money.of(2n ** 64n + 1n, USD).allocate([1, 1]);
      expect(big[0].add(big[1]).amount, 'huge amounts still sum exactly').toBe(2n ** 64n + 1n);
    },
  },
  {
    group: G2,
    title: 'bad ratios throw RangeError',
    run({ Money, USD }, { expect }) {
      const m = Money.of(100, USD);
      expect(thrown(() => m.allocate([])) instanceof RangeError, 'empty').toBe(true);
      expect(thrown(() => m.allocate([0, 0])) instanceof RangeError, 'all zero').toBe(true);
      expect(thrown(() => m.allocate([2, -1])) instanceof RangeError, 'negative').toBe(true);
      expect(thrown(() => m.allocate([0.5, 0.5])) instanceof RangeError, 'not integers').toBe(true);
    },
  },
  {
    group: G3,
    title: 'rounding modes on exact ties',
    input: '0.25 × 0.5 = 0.125 and -0.25 × 0.5 = -0.125',
    run({ Money, USD }, { expect }) {
      const pos = Money.fromDecimal('0.25', USD);
      const neg = Money.fromDecimal('-0.25', USD);
      expect(pos.multiply(0.5).toDecimal(), 'default is half-even').toBe('0.12');
      expect(pos.multiply(0.5, 'half-even').toDecimal()).toBe('0.12');
      expect(Money.fromDecimal('0.35', USD).multiply(0.5, 'half-even').toDecimal(), '0.175 → 0.18').toBe('0.18');
      expect(pos.multiply(0.5, 'half-up').toDecimal()).toBe('0.13');
      expect(neg.multiply(0.5, 'half-up').toDecimal(), 'half-up goes away from zero').toBe('-0.13');
      expect(neg.multiply(0.5, 'half-even').toDecimal()).toBe('-0.12');
      expect(neg.multiply(0.5, 'floor').toDecimal()).toBe('-0.13');
      expect(neg.multiply(0.5, 'ceil').toDecimal()).toBe('-0.12');
      expect(pos.multiply(0.5, 'floor').toDecimal()).toBe('0.12');
      expect(pos.multiply(0.5, 'ceil').toDecimal()).toBe('0.13');
    },
  },
  {
    group: G3,
    title: 'factors are exact decimals, not binary doubles',
    run({ Money, USD }, { expect }) {
      const one = Money.fromDecimal('1.00', USD);
      expect(one.multiply(1.005, 'half-up').toDecimal(), '1.005 is a tie, not 1.00499999…').toBe('1.01');
      expect(one.multiply('1.005', 'half-up').toDecimal(), 'string factor').toBe('1.01');
      expect(Money.fromDecimal('100.00', USD).multiply(1.075).toDecimal()).toBe('107.50');
      expect(Money.fromDecimal('4.35', USD).multiply(100).toDecimal()).toBe('435.00');
      expect(Money.fromDecimal('0.10', USD).multiply(3).toDecimal()).toBe('0.30');
      expect(thrown(() => one.multiply(Infinity)) instanceof RangeError, 'Infinity').toBe(true);
      expect(thrown(() => one.multiply(NaN)) instanceof RangeError, 'NaN').toBe(true);
    },
  },
  {
    group: G3,
    title: 'currencies with 0 and 3 decimals',
    run({ Money, JPY, KWD }, { expect }) {
      expect(Money.of(100, JPY).multiply('1.075').toDecimal(), '107.5 → 108 (even)').toBe('108');
      expect(Money.of(100, JPY).multiply('1.085').toDecimal(), '108.5 → 108 (even)').toBe('108');
      expect(Money.of(100, JPY).multiply('1.085', 'half-up').toDecimal()).toBe('109');
      expect(Money.fromDecimal('1.000', KWD).multiply('1.0005').toDecimal(), '1.0005 → 1.000').toBe('1.000');
      expect(Money.fromDecimal('1.000', KWD).multiply('1.0005', 'half-up').toDecimal()).toBe('1.001');
      expect(Money.fromDecimal('1.000', KWD).allocate([1, 2]).map((m) => m.toDecimal())).toEqual(['0.334', '0.666']);
    },
  },
  {
    group: G4,
    title: 'convert between currencies with different exponents',
    run({ Money, USD, EUR, JPY, KWD }, { expect }) {
      expect(Money.fromDecimal('10.00', USD).convert(EUR, 0.9137).toDecimal()).toBe('9.14');
      expect(Money.fromDecimal('100.00', USD).convert(JPY, 151.237).toDecimal()).toBe('15124');
      expect(Money.of(1000, JPY).convert(USD, '0.0066').toDecimal()).toBe('6.60');
      expect(Money.fromDecimal('1.000', KWD).convert(USD, '3.2565').toDecimal(), '3.2565 → 3.26').toBe('3.26');
      expect(Money.fromDecimal('1.000', KWD).convert(USD, '3.2565', 'floor').toDecimal()).toBe('3.25');
      expect(Money.fromDecimal('0.125', KWD).convert(USD, 1).toDecimal(), 'tie → even').toBe('0.12');
      expect(Money.of(100, USD).convert(EUR, 1).currency.code).toBe('EUR');
      expect(thrown(() => Money.of(100, USD).convert(EUR, 0)) instanceof RangeError, 'rate must be positive').toBe(true);
    },
  },
  {
    group: G4,
    title: 'format uses Intl with the currency\'s decimals',
    run({ Money, USD, EUR, JPY, KWD }, { expect }) {
      const intl = (locale: string, code: string, digits: number, n: number) =>
        new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
      expect(Money.fromDecimal('1234.5', USD).format('en-US')).toBe(intl('en-US', 'USD', 2, 1234.5));
      expect(Money.fromDecimal('1234.5', EUR).format('de-DE')).toBe(intl('de-DE', 'EUR', 2, 1234.5));
      expect(Money.of(1234, JPY).format('en-US')).toBe(intl('en-US', 'JPY', 0, 1234));
      expect(Money.fromDecimal('1.5', KWD).format('en-US')).toBe(intl('en-US', 'KWD', 3, 1.5));
      expect(Money.of(-5, USD).format('en-US')).toBe(intl('en-US', 'USD', 2, -0.05));
    },
  },
];
