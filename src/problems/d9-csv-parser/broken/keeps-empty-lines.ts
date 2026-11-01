// Bug: empty lines become empty records
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

const CANDIDATES = [',', '\t', ';', '|'];

export function createParser(opts: StreamOptions): { write(chunk: string): void; end(): void } {
  const delim = opts.delimiter ?? ',';
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
    {
      endField();
      rowNo++;
      opts.onRow(row, rowNo);
    }
    row = []; field = ''; state = 'start'; started = false;
  };

  return {
    write(chunk: string) {
      if (ended) throw new Error('Parser already ended');
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
      if (state === 'quoted') opts.onError?.({ row: rowNo + 1, message: 'Unclosed quote' });
      endRow();
    },
  };
}

function detect(text: string): string {
  let best = ',';
  let bestCount = 0;
  let inQ = false;
  const counts = new Map<string, number>();
  for (const c of text.replace(/^\uFEFF/, '')) {
    if (c === '"') inQ = !inQ;
    else if (!inQ && (c === '\n' || c === '\r')) break;
    else if (!inQ && CANDIDATES.includes(c)) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  for (const d of CANDIDATES) {
    const n = counts.get(d) ?? 0;
    if (n > bestCount) { best = d; bestCount = n; }
  }
  return best;
}

const NUM = /^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
function typed(v: string): unknown {
  if (v === '') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (NUM.test(v)) return Number(v);
  return v;
}

export function parse(text: string, opts: ParseOptions = {}): ParseResult {
  const delimiter = opts.delimiter === 'auto' ? detect(text) : opts.delimiter ?? ',';
  const data: unknown[] = [];
  const errors: ParseError[] = [];
  let header: string[] | null = null;
  const conv = (v: string) => (opts.dynamicTyping ? typed(v) : v);
  const p = createParser({
    delimiter,
    onError: (e) => errors.push(e),
    onRow(fields, row) {
      if (!opts.header) { data.push(fields.map(conv)); return; }
      if (!header) { header = fields; return; }
      if (fields.length !== header.length) {
        errors.push({ row, message: `Expected ${header.length} fields, got ${fields.length}` });
        return;
      }
      const obj: Record<string, unknown> = {};
      header.forEach((h, i) => { obj[h] = conv(fields[i]); });
      data.push(obj);
    },
  });
  p.write(text);
  p.end();
  return { data, errors };
}
