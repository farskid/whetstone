Handle Windows line endings and characters outside the BMP.

- Line breaks are now `\n` and `\r\n`. A lone `\r` is ordinary text. `getLine` drops a `\r\n` break completely.
- The pieces don't know about lines, so a `\r` and its `\n` may sit in different pieces (for example, typed separately). They're still one `\r\n` break.
- `positionAt` of an offset inside a break (on the `\r` of a `\r\n`, or between `\r` and `\n`) maps to the end of that line. `offsetAt` clamps `col` to the line's length without the `\r\n`.
- Columns stay in UTF-16 code units. An edit must never split a surrogate pair. If an edit's start, or the end of a deleted range, falls between the two halves of a pair, throw a `RangeError` and leave the buffer unchanged.
- If `offsetAt`'s `col` lands between the two halves of a surrogate pair, it moves back to the start of the pair.
