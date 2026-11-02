import type { ParseError, ParseOptions, ParseResult } from './types';

interface StreamOptions {
  delimiter: string;
  onRow(fields: string[]): void;
  onError(err: ParseError): void;
}

function createParser(opts: StreamOptions): { write(chunk: string): void; end(): void } {
  const delim = opts.delimiter;
  let state: 'start' | 'unquoted' | 'quoted' | 'afterQuote' = 'start';
  let field = '';
  let row: string[] = [];
  let started = false;
  let skipLF = false;
  let first = true;
  let rowNo = 0;
  let ended = false;

  const endField = () => { row.push(field); field = ''; state = 'start'; };
  const endRow = () => {
    if (started) {
      endField();
      rowNo++;
      opts.onRow(row);
    }
    row = []; field = ''; state = 'start'; started = false;
  };

  return {
    write(chunk: string) {
      for (const c of chunk) {
        if (first) { first = false; if (c === '\uFEFF') continue; }
        if (skipLF) { skipLF = false; if (c === '\n') continue; }
        if (state === 'quoted') {
          if (c === '"') state = 'afterQuote'; else field += c;
          continue;
        }
        if (state === 'afterQuote' && c === '"') { field += '"'; state = 'quoted'; continue; }
        if (c === delim) { started = true; endField(); continue; }
        if (c === '\n' || c === '\r') { if (c === '\r') skipLF = true; endRow(); continue; }
        started = true;
        if (c === '"' && state === 'start') { state = 'quoted'; continue; }
        field += c;
        state = 'unquoted';
      }
    },
    end() {
      if (ended) return;
      ended = true;
      if (state === 'quoted') opts.onError({ row: rowNo + 1, message: 'Unclosed quote' });
      endRow();
    },
  };
}

export function parse(text: string, opts: ParseOptions = {}): ParseResult {
  const data: string[][] = [];
  const errors: ParseError[] = [];
  const p = createParser({
    delimiter: opts.delimiter ?? ',',
    onError: (e) => errors.push(e),
    onRow: (fields) => data.push(fields),
  });
  p.write(text);
  p.end();
  return { data, errors };
}
