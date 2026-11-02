Add `compile` and syntax errors.

```ts
const t = compile('{{#xs}}{{.}}{{/xs}}', {});
t({ xs: [1, 2] });   // '12'
compile('{{#a}}{{#b}}x{{/a}}{{/b}}');  // throws 'Unexpected closing tag "a" (line 1, column 14)'

function compile(template: string, options?: RenderOptions): (data: unknown) => string;
```

- `compile` parses the template once and returns a function that renders it with any data. `render(t, d, o)` is the same as `compile(t, o)(d)`.
- Templates can now be malformed. Syntax errors are `TemplateError`s, thrown by `compile` (and so by `render`) before any output:
  - ``Unclosed tag``: a `{{` (or `{{{`) without its closing braces;
  - ``Unclosed section "<name>"``: points at the opening tag of the innermost unclosed section;
  - ``Unexpected closing tag "<name>"``: the closing tag doesn't match the innermost open section, or nothing is open. Points at the closing tag.
- Partial templates are parsed when they're first rendered.
