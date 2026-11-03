Add sections, inverted sections and the context stack.

```ts
render('{{#items}}<li>{{name}} by {{author}}</li>{{/items}}{{^items}}Empty{{/items}}',
  { author: 'anon', items: [{ name: 'Dune', author: 'Herbert' }, { name: 'Untitled' }] });
// '<li>Dune by Herbert</li><li>Untitled by anon</li>'
```

| Tag | Meaning |
| --- | --- |
| `{{#name}}…{{/name}}` | section |
| `{{^name}}…{{/name}}` | inverted section |

Sections can nest. `name` is a path, looked up like a variable.

**Context stack**
- Rendering keeps a stack of contexts, which starts as `[data]`. <!-- tests: the context stack falls back to outer scopes -->
- `{{.}}` is the top of the stack. <!-- tests: loops push each item; {{.}} is the current item -->
- For `a.b.c`, find the first segment as an own property of the nearest context, searching from the top of the stack down. Follow the remaining segments from that value only. So `{{b.c}}` doesn't fall back further if the nearest `b` has no `c`. <!-- tests: the context stack falls back to outer scopes -->
- The stage 1 own-property and forbidden-key rules still apply.

**Sections**
- A value is *empty* if it's falsy or an empty array.
- In a section `{{#x}}`:
  - an empty value renders nothing;
  - an array renders the body once per item, with that item pushed onto the stack; <!-- tests: loops push each item; {{.}} is the current item -->
  - any other value renders the body once, with the value pushed. <!-- tests: truthiness, objects and inverted sections -->
- An inverted section renders its body (with the stack unchanged) only when the value is empty. <!-- tests: truthiness, objects and inverted sections -->
