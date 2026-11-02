import type { ParseOptions, ParseResult, StreamOptions } from './types';

export function createParser(opts: StreamOptions): { write(chunk: string): void; end(): void } {
  throw new Error('Not implemented');
}

export function parse(text: string, opts: ParseOptions = {}): ParseResult {
  throw new Error('Not implemented');
}
