Write the core of a PapaParse-style CSV parser. Start with plain rows and fields, with no quoting yet.

```ts
parse('a,b,c\n1,2,3\n').data;              // [['a', 'b', 'c'], ['1', '2', '3']]
parse('a\tb', { delimiter: '\t' }).data;   // [['a', 'b']]
```

```ts
function parse(text: string, opts?: { delimiter?: string }): { data: string[][] };
```

- Records end at `\n`, `\r\n` or a lone `\r`.
- A trailing line break doesn't create an extra record, and completely empty lines are skipped.
- Fields are split on the delimiter, which defaults to `,`. A line with only a delimiter is a record of two empty fields.
- `''` gives `{ data: [] }`.
- Every character other than delimiters and line breaks is part of a field, including quotes (quoting comes next).
