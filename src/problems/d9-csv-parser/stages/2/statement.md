Add RFC 4180 quoting, a BOM and error reporting.

```ts
parse('1,"x, y"\n2,"say ""hi"""\n');
// { data: [['1', 'x, y'], ['2', 'say "hi"']], errors: [] }

interface ParseError { row: number; message: string }
// parse now returns { data: string[][]; errors: ParseError[] }
```

- A field that **starts** with `"` is quoted. It runs to the next unpaired `"`, and inside it delimiters, `\r` and `\n` are ordinary characters. `""` stands for one `"`.
- Text after a closing quote, up to the next delimiter or line break, is appended literally: `"q"tail` is `qtail`.
- A `"` anywhere else in an unquoted field is literal: `a"b`.
- `""` as a whole field is an empty field, and that record isn't an empty line.
- A leading BOM (`\uFEFF`) is ignored.
- If the input ends inside a quoted field, add `{ row, message: 'Unclosed quote' }` to `errors` and still emit the record. `row` is that record's number, counting records from 1.
- Otherwise `errors` is `[]`.
