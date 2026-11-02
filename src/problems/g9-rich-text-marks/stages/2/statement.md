# Rich-text marks: toggle and delete

Add the bold button's behaviour, `toggleMark`, and deleting text.

```ts
const ed = createEditor([{ text: 'one ', marks: [{ type: 'bold' }] }, { text: 'two', marks: [] }]);
ed.toggleMark(0, 7, 'bold'); // partly bold, so all of it becomes bold
ed.toggleMark(0, 7, 'bold'); // all bold, so bold is removed
ed.deleteText(1, 3);         // 'one two' becomes 'o two'
```

- **`toggleMark(from, to, mark)`.** If every character in the range already has an equal mark, remove marks of that type. Otherwise, add the mark to the whole range. An empty range changes nothing.
- **`deleteText(from, to)`.** Removes the characters in the range. Neighbours that end up with equal marks merge.
- Both throw a `RangeError` for a bad range, like the other methods.

Everything from earlier stages still applies.
