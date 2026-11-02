Allow circular imports, and write each chunk's code.

```ts
const { chunks, cycles } = await bundle({ input: '/a.js', files: { '/a.js': "import './b';", '/b.js': "import './a';" } });
cycles;           // [['/a.js', '/b.js', '/a.js']]
chunks[0].code;   // define("/b.js", …) then define("/a.js", …) then require("/a.js");

interface Chunk { /* ...stage 2, plus: */ code: string }
```

**Cycles**
- The module walk keeps a stack of the modules it is inside.
- Reaching a module that is still on the stack doesn't recurse. Record the cycle as the stack slice from that module to the current one, plus that module again, e.g. `['/a.js', '/b.js', '/a.js']`. A module importing itself gives `['/self.js', '/self.js']`.
- `cycles` lists them in the order found. Loading still visits each module once.

**Code**
- For each module in `modules` order:

  ```
  define("<id>", function (module, exports, require) {
  <transformed code>
  });
  ```

  The ids are JSON-quoted, and the entries are joined with `\n`.
- Then add `\nrequire("<entry id>");`.
- The code ends with `\n`.
