Add virtual modules and a separate chunk for each dynamic `import()`.

```ts
const files = { '/main.js': "button.onclick = () => import('./pages/about.js');", '/pages/about.js': '…' };
const { chunks } = await bundle({ input: '/main.js', files });
chunks.map((c) => c.name);   // ['main', 'about']

interface Chunk { /* ...stage 3, plus: */ requires: string[] }   // [] for main
```

**Virtual modules**
- Ids starting with `\0` are virtual. They are never read from `files` (only a plugin's `load` can supply them), and imports from them are not resolved by default.

**Loading dynamic imports**
- After resolving a module's static imports, resolve its dynamic imports the same way. Then visit the static dependencies, then the dynamic ones, in order. Duplicates count once.

**Chunks**
- Chunk 0 is the entry chunk, named `main`, built as before (static imports only).
- Dynamic imports whose target isn't in an existing chunk queue a new chunk:
  - Targets are queued in the order they appear: walk the chunk's modules in order, and within each module its dynamic imports in order.
  - Chunks are then built in queue order.
  - A queued target that already belongs to a chunk by the time its turn comes produces no chunk.
- A non-entry chunk's `modules` use the same static walk, but the walk stops at modules owned by an earlier chunk:
  - If the owner is `main`, nothing is recorded, because main is always loaded.
  - Otherwise the owner's name goes in `requires`, in chunk order and without duplicates.
  - Cycles found in any chunk's walk go in `cycles`.
- Only the main chunk's code ends with `require(...)`. Every chunk's code still ends with `\n`.

**Names**
1. Take the entry id without a leading `\0`.
2. Keep the last path segment and drop its extension.
3. Replace characters outside `[A-Za-z0-9_-]` with `_`.
4. If the name is taken, append 2, 3, …

For example, `/src/pages/about.js` → `about`, and `\0virtual:x` → `virtual_x`.
