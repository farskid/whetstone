# Text diff: apply

Add `applyPatch(source, patch)`.

```ts
const patch = createPatch('f', oldText, newText);
applyPatch(oldText, patch) === newText; // true
applyPatch('header\n' + oldText, patch); // still applies, one line further down
```

```ts
applyPatch(source: string, patch: string | StructuredPatch): string
```

- `patch` is the text from `createPatch` or a structured patch. Apply the hunks in order.
- Each hunk's context and removed lines (with their exact terminators, using the no-newline markers) must match the source.
- Look first where the hunk says, adjusted by how far earlier hunks moved. If it doesn't match there, try positions 1, 2, 3… lines away. At each distance, check the earlier position first.
- A hunk that matches nowhere throws an `Error`.
