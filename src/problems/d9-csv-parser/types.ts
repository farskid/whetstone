/** A problem found while parsing; `row` is the record number it belongs to. */
export interface ParseError {
  row: number;
  message: string;
}

/** Options for the streaming parser. */
export interface StreamOptions {
  /** Field separator; default `,`. */
  delimiter?: string;
  /** Called with each record and its 1-based number. */
  onRow(fields: string[], row: number): void;
  onError?(err: ParseError): void;
}

export interface ParseOptions {
  /** Field separator, or `'auto'` to detect it; default `,`. */
  delimiter?: string | 'auto';
  /** Treat the first record as keys and return objects. */
  header?: boolean;
  /** Convert values to numbers, booleans and null. */
  dynamicTyping?: boolean;
}

export interface ParseResult {
  data: unknown[];
  errors: ParseError[];
}

/** What `createParser` returns: feed it chunks, then end it. */
export interface CsvParser {
  write(chunk: string): void;
  /** Flushes the last record. */
  end(): void;
}
