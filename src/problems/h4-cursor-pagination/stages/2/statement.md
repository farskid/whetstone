# Cursor pagination: dedupe and guards

Real APIs misbehave: data shifts while you page, and a buggy server can send the same cursor twice. Make `paginate` robust against both.

```ts
// page 1 has items with ids [1, 2]; page 2 has [2, 3]
for await (const item of paginate(fetchPage)) console.log(item.id); // 1, 2, 3
```

## Dedupe and guards

- **Dedupe.** Data can shift while you page, so an item can show up twice. Skip any item whose id was already yielded. The id comes from `options.getId(item)`, which defaults to `item.id`.
- **Loop guard.** A page whose `hasNextPage` is true would loop forever if:
  - its `endCursor` is `null`, or
  - its `endCursor` was already used, and the start cursor counts as used.

  In either case, throw an `Error` as soon as that page arrives, before yielding any of its items. For a repeated cursor, the message must contain "repeat".
- **Errors.** If `fetchPage` rejects, the generator throws that error. `.cursor` still points at the page that failed, so `paginate(fetchPage, { startCursor: gen.cursor })` resumes there.

Everything from earlier stages still applies.
