export interface ParseOptions {
  /** Field separator; default `,`. */
  delimiter?: string;
}

export interface ParseResult {
  /** One array of fields per record. */
  data: string[][];
}
