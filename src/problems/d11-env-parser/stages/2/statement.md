Add full quoting rules and inline comments.

```ts
parse('A=value # note\nB=a#b\nC="x\\ny" # note\nKEY="line1\nline2"\n');
// { A: 'value', B: 'a#b', C: 'x\ny', KEY: 'line1\nline2' }
```

**Unquoted values** run to the end of the line.
- A `#` at the start of the value or after whitespace starts a comment, which is dropped. <!-- tests: inline comments: after whitespace in unquoted values, after the closing quote -->
- A `#` in the middle of a word is kept (`a#b`).
- The value is then trimmed.

**Quoted values** start with `'`, `"` or `` ` `` right after the `=` (and spaces).
- The value runs to the next matching quote, even across lines, so multiline values work. The quotes are removed, and the text inside is kept exactly (no trimming). <!-- tests: multiline quoted values span lines; an unclosed quote is read as unquoted -->
- Anything after the closing quote on that line is ignored, comment or not. Parsing continues on the next line. <!-- tests: inline comments: after whitespace in unquoted values, after the closing quote -->
- Inside **double** quotes only, `\n` becomes a newline and `\r` a carriage return. Single and backtick quotes are literal. <!-- tests: single, double and backtick quotes; escapes only in double quotes -->
- If the closing quote is missing, the value is read as unquoted, opening quote included (`"open`). <!-- tests: multiline quoted values span lines; an unclosed quote is read as unquoted -->
