// Bug: every part gets a minus sign
export interface BytesOptions {
  /** Powers of 1024 with KiB, MiB, … instead of powers of 1000 with kB, MB, … */
  binary?: boolean;
  locale?: string;
  /** Digits after the decimal point (default 1). Ignored when significantDigits is set. */
  fractionDigits?: number;
  significantDigits?: number;
}

export interface DurationOptions {
  long?: boolean;
}

export interface RelativeOptions {
  locale?: string;
  numeric?: 'always' | 'auto';
}

const SI = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const IEC = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

function finite(n: unknown, what: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new RangeError(`${what} must be a finite number, got ${String(n)}`);
  return n;
}

export function formatBytes(bytes: number, options: BytesOptions = {}): string {
  finite(bytes, 'bytes');
  const { binary = false, locale = 'en-US', fractionDigits = 1, significantDigits } = options;
  const base = binary ? 1024 : 1000;
  const units = binary ? IEC : SI;
  const round = (v: number) => (significantDigits !== undefined ? Number(v.toPrecision(significantDigits)) : Number(v.toFixed(fractionDigits)));
  const abs = Math.abs(bytes);
  let exp = 0;
  while (exp < units.length - 1 && abs >= base ** (exp + 1)) exp++;
  let value = round(abs / base ** exp);
  // Rounding can carry into the next unit: 999.95 kB → 1000 kB → 1 MB.
  if (value >= base && exp < units.length - 1) {
    exp++;
    value = round(abs / base ** exp);
  }
  const signed = bytes < 0 && value !== 0 ? -value : value;
  const text = new Intl.NumberFormat(locale, { maximumFractionDigits: 20, useGrouping: false }).format(signed);
  return `${text} ${units[exp]}`;
}

const UNIT_MS: Record<string, number> = {};
const define = (ms: number, ...names: string[]) => names.forEach((n) => (UNIT_MS[n] = ms));
define(1, 'ms', 'msec', 'msecs', 'millisecond', 'milliseconds');
define(1000, 's', 'sec', 'secs', 'second', 'seconds');
define(60_000, 'm', 'min', 'mins', 'minute', 'minutes');
define(3_600_000, 'h', 'hr', 'hrs', 'hour', 'hours');
define(86_400_000, 'd', 'day', 'days');
define(604_800_000, 'w', 'week', 'weeks');

export function parseDuration(text: string): number {
  if (typeof text !== 'string') throw new RangeError('Duration must be a string');
  let s = text.trim();
  let sign = 1;
  if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1).trimStart();
  }
  if (!s) throw new RangeError(`Invalid duration: "${text}"`);
  const token = /(\d+(?:\.\d+)?|\.\d+)\s*([a-z]*)\s*/iy;
  let total = 0;
  let tokens = 0;
  let unitless = false;
  while (token.lastIndex < s.length) {
    const m = token.exec(s);
    if (!m) throw new RangeError(`Invalid duration: "${text}"`);
    tokens++;
    const unit = m[2].toLowerCase();
    if (!unit) unitless = true;
    else if (!(unit in UNIT_MS)) throw new RangeError(`Unknown unit "${m[2]}" in "${text}"`);
    total += Number(m[1]) * (unit ? UNIT_MS[unit] : 1);
  }
  if (unitless && tokens > 1) throw new RangeError(`Missing unit in "${text}"`);
  return sign * total;
}

const PARTS: [number, string, string][] = [
  [86_400_000, 'd', 'day'],
  [3_600_000, 'h', 'hour'],
  [60_000, 'm', 'minute'],
  [1000, 's', 'second'],
  [1, 'ms', 'millisecond'],
];

export function formatDuration(ms: number, options: DurationOptions = {}): string {
  finite(ms, 'ms');
  let rest = Math.round(Math.abs(ms));
  const out: string[] = [];
  for (const [size, short, long] of PARTS) {
    const n = Math.floor(rest / size);
    rest -= n * size;
    if (n) out.push(options.long ? `${n} ${long}${n === 1 ? '' : 's'}` : `${n}${short}`);
  }
  if (!out.length) return options.long ? '0 milliseconds' : '0ms';
  return out.map((p) => (ms < 0 ? '-' : '') + p).join(' ');
}

export function relativeTime(date: Date | number, now: Date | number, options: RelativeOptions = {}): string {
  const t = finite(typeof date === 'number' ? date : date?.getTime?.(), 'date');
  const n = finite(typeof now === 'number' ? now : now?.getTime?.(), 'now');
  const seconds = (t - n) / 1000;
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? -1 : 1;
  const r = (x: number) => sign * Math.round(x);
  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (abs < 45) [value, unit] = [r(abs), 'second'];
  else if (abs < 45 * 60) [value, unit] = [r(abs / 60), 'minute'];
  else if (abs < 22 * 3600) [value, unit] = [r(abs / 3600), 'hour'];
  else if (abs < 26 * 86400) [value, unit] = [r(abs / 86400), 'day'];
  else if (abs < 320 * 86400) [value, unit] = [r(abs / 86400 / 30), 'month'];
  else [value, unit] = [r(abs / 86400 / 365), 'year'];
  return new Intl.RelativeTimeFormat(options.locale ?? 'en', { numeric: options.numeric ?? 'always' }).format(value === 0 ? 0 : value, unit);
}
