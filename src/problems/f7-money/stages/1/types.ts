/** A currency and how many decimals its minor unit has. */
export interface Currency {
  code: string;
  /** Number of minor-unit digits: 2 for USD, 0 for JPY, 3 for KWD. */
  exponent: number;
}
