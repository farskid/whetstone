import type { ParseOptions, ParseResult, StreamOptions, CsvParser } from './types';

export function createParser(opts: StreamOptions): CsvParser {
  throw new Error('Not implemented');
}

export function parse(text: string, opts: ParseOptions = {}): ParseResult {
  throw new Error('Not implemented');
}
