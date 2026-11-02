# Rich-text marks: typing

Add typing. Typed text picks up marks from where the cursor is, the way it does in a real editor.

```ts
const ed = createEditor([{ text: 'ab', marks: [{ type: 'bold' }] }, { text: 'cd', marks: [] }]);
ed.insertText(2, 'X');      // 'abX' is bold: the character before the cursor wins
ed.toggleMark(5, 5, 'italic');
ed.insertText(5, '!');      // '!' is italic: the stored mark is used once
```

- **`insertText(pos, text)`.** Typed text gets `marksAt(pos)`.
- **`marksAt(pos)`.** The marks of the character before `pos`. At position 0 it uses the first character instead, and in an empty document it returns no marks.
- **Links aren't inclusive.** A link carries over only when the characters on **both** sides of `pos` have that same link. Typing just after or just before a link doesn't extend it.
- **Stored marks.** A collapsed `toggleMark(pos, pos, mark)` changes no text. Instead it toggles the mark in a set of stored marks for `pos`, starting from `marksAt(pos)`.
  - While the stored marks are set, `marksAt(pos)` returns them.
  - Text typed at `pos` gets them.
  - Typing, deleting, or calling `addMark`, `removeMark` or a ranged `toggleMark` clears them, so they're used only once. Another collapsed toggle at a different position replaces them.
- **Bad positions.** `insertText`, `marksAt` and a collapsed `toggleMark` throw a `RangeError` unless `pos` is a whole number with `0 ≤ pos ≤ length`. Inserting an empty string changes nothing.

Everything from earlier stages still applies.
