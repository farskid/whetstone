import type { ParseOptions, ParseResult } from './types';

export function parse(text: string, opts: ParseOptions = {}): ParseResult {
  const delimiter = opts.delimiter ?? ',';
  const data = text
    .split(/\r\n|\r|\n/)
    .filter((line) => line !== '')
    .map((line) => line.split(delimiter));
  return { data };
}
