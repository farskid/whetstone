# CSV parser

Write the core of PapaParse: a streaming CSV state machine, plus a one-shot `parse` on top of it.

```ts
parse('name,age\nAda,36\n"Hopper, Grace",85\n', { header: true, dynamicTyping: true });
// { data: [{ name: 'Ada', age: 36 }, { name: 'Hopper, Grace', age: 85 }], errors: [] }

const p = createParser({ onRow: (fields, row) => console.log(row, fields) });
p.write('a,"b\r'); p.write('\nc"\r'); p.write('\n'); p.end(); // 1 ['a', 'b\r\nc']
```

## API

```ts
interface ParseError { row: number; message: string }
interface StreamOptions {
  delimiter?: string;                         // default ','
  onRow(fields: string[], row: number): void; // row numbers start at 1
  onError?(err: ParseError): void;
}
interface CsvParser { write(chunk: string): void; end(): void }
function createParser(opts: StreamOptions): CsvParser;

function parse(text: string, opts?: {
  delimiter?: string | 'auto';                // default ','
  header?: boolean;
  dynamicTyping?: boolean;
}): { data: unknown[]; errors: ParseError[] };
```

## Rules

**Records**
- Records end at `\n`, `\r\n` or a lone `\r`.
- A trailing line break doesn't create an extra record, and completely empty lines are skipped. A line with only a delimiter is a record of two empty fields.
- A leading BOM (`\uFEFF`) is ignored.
- Rows are numbered from 1 in the order they're emitted, counting a header row.

**Fields**
- Fields are split on the delimiter.
- A field that **starts** with `"` is quoted. It runs to the next unpaired `"`, and inside it delimiters, `\r` and `\n` are ordinary characters. `""` stands for one `"`.
- Text after a closing quote, up to the next delimiter or line break, is appended literally.
- A `"` anywhere else in an unquoted field is literal: `a"b`.
- If the input ends inside a quoted field, report `{ row, message: 'Unclosed quote' }` through `onError` (the row number that record gets) and still emit the record.

**Streaming**
- `write` can receive any slice of the input. A record is emitted as soon as its line break arrives, so a `\r` at the end of one chunk followed by `\n` in the next is still one break.
- `end()` emits the last record if there is one.
- Splitting the input at any positions must give exactly the same records as writing it all at once.

**`parse`**
- `delimiter: 'auto'` picks whichever of `,` `\t` `;` `|` occurs most often in the first record, ignoring quoted text. Ties go to that order, and if none occur it uses `,`.
- Without `header`, `data` is the array of field arrays.
- With `header`, the first record gives the keys and each later record becomes an object. A record with a different field count is left out of `data` and reported as `{ row, message: 'Expected N fields, got M' }`.
- `dynamicTyping` converts every value:
  - `''` → `null`;
  - `'true'`/`'false'` → booleans;
  - strings matching `-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?` → numbers;
  - anything else stays a string.
- `errors` are in the order they were found.
