Expose the parser as a streaming state machine, with `parse` built on top of it.

```ts
const p = createParser({ onRow: (fields, row) => console.log(row, fields) });
p.write('a,"b\r'); p.write('\nc"\r'); p.write('\n'); p.end(); // 1 ['a', 'b\r\nc']

function createParser(opts: {
  delimiter?: string;                         // default ','
  onRow(fields: string[], row: number): void; // row numbers start at 1
  onError?(err: ParseError): void;
}): { write(chunk: string): void; end(): void };
```

- `createParser` applies the record and field rules from stages 1 and 2, including the BOM at the very start of the input.
- `write` can receive any slice of the input. A record is emitted as soon as its line break arrives, so a `\r` at the end of one chunk followed by `\n` in the next is still one break.
- `end()` emits the last record if there is one, and reports `Unclosed quote` through `onError` first if the input ended inside a quoted field. Calling `end()` again does nothing.
- Splitting the input at any positions must give exactly the same records as writing it all at once.
- `write` after `end()` throws an `Error`.
