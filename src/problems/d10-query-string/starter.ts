export interface ParseOptions {
  depth?: number;
  parameterLimit?: number;
  arrayLimit?: number;
}
export interface StringifyOptions {
  arrayFormat?: 'indices' | 'brackets' | 'repeat';
}
type Value = string | Value[] | { [k: string]: Value };

export function parse(input: string, opts: ParseOptions = {}): Record<string, Value> {
  throw new Error('Not implemented');
}

export function stringify(obj: Record<string, unknown>, opts: StringifyOptions = {}): string {
  throw new Error('Not implemented');
}
