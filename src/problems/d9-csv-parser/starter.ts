export interface ParseError {
  row: number;
  message: string;
}
export interface StreamOptions {
  delimiter?: string;
  onRow(fields: string[], row: number): void;
  onError?(err: ParseError): void;
}
export interface ParseOptions {
  delimiter?: string | 'auto';
  header?: boolean;
  dynamicTyping?: boolean;
}
export interface ParseResult {
  data: unknown[];
  errors: ParseError[];
}

export function createParser(opts: StreamOptions): { write(chunk: string): void; end(): void } {
  throw new Error('Not implemented');
}

export function parse(text: string, opts: ParseOptions = {}): ParseResult {
  throw new Error('Not implemented');
}
