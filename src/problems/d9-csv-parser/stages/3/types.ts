/** A problem found while parsing; `row` is the record number it belongs to. */
export interface ParseError {
  row: number;
  message: string;
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
