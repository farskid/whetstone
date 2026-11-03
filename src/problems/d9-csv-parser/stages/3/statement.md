Add headers, dynamic typing and delimiter detection.

```ts
parse('name,age\nAda,36\n"Hopper, Grace",85\n', { header: true, dynamicTyping: true });
// { data: [{ name: 'Ada', age: 36 }, { name: 'Hopper, Grace', age: 85 }], errors: [] }

// options: { delimiter?: string | 'auto'; header?: boolean; dynamicTyping?: boolean }
// result:  { data: unknown[]; errors: ParseError[] }
```

- `delimiter: 'auto'` picks whichever of `,` `\t` `;` `|` occurs most often in the first record, ignoring quoted text. Ties go to that order, and if none occur it uses `,`. <!-- tests: delimiter detection uses the first record and ignores quoted text -->
- Without `header`, `data` is the array of field arrays.
- With `header`, the first record gives the keys and each later record becomes an object. <!-- tests: header rows become object keys; ragged rows are reported by row number -->
  - A record with a different field count is left out of `data` and reported as `{ row, message: 'Expected N fields, got M' }`. <!-- tests: header rows become object keys; ragged rows are reported by row number -->
  - Rows are numbered from 1, counting the header row. <!-- tests: header rows become object keys; ragged rows are reported by row number -->
- `dynamicTyping` converts every value, in arrays and objects alike (header keys stay strings): <!-- tests: dynamic typing: numbers, booleans and empty as null -->
  - `''` → `null`;
  - `'true'`/`'false'` → booleans;
  - strings matching `-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?` → numbers;
  - anything else stays a string.
- `errors` are in the order they were found.
