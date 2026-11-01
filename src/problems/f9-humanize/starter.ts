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

export function formatBytes(bytes: number, options: BytesOptions = {}): string {
  throw new Error('Not implemented');
}

export function parseDuration(text: string): number {
  throw new Error('Not implemented');
}

export function formatDuration(ms: number, options: DurationOptions = {}): string {
  throw new Error('Not implemented');
}

export function relativeTime(date: Date | number, now: Date | number, options: RelativeOptions = {}): string {
  throw new Error('Not implemented');
}
