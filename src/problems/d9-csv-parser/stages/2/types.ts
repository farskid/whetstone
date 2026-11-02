/** A problem found while parsing; `row` is the record number it belongs to. */
export interface ParseError {
  row: number;
  message: string;
}

export interface ParseOptions {
  /** Field separator; default `,`. */
  delimiter?: string;
}

export interface ParseResult {
  /** One array of fields per record. */
  data: string[][];
  errors: ParseError[];
}
