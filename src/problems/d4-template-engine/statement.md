# Template engine

Write a Mustache-style template engine with Handlebars-style helpers.

```ts
render('<h1>{{title}}</h1>{{#items}}<li>{{name}} by {{author}}</li>{{/items}}{{^items}}Empty{{/items}}',
  { title: 'Books & more', author: 'anon', items: [{ name: 'Dune', author: 'Herbert' }, { name: 'Untitled' }] });
// '<h1>Books &amp; more</h1><li>Dune by Herbert</li><li>Untitled by anon</li>'
```

## API

```ts
render(template: string, data: unknown, options?: { partials?: Record<string, string>; helpers?: Record<string, (...args: unknown[]) => unknown> }): string
compile(template, options?): (data: unknown) => string   // parses once; throws syntax errors immediately
class TemplateError extends Error { line: number; column: number }
```

## Tags

Whitespace just inside a tag is ignored (`{{ name }}`). Text outside tags is copied exactly. There is no standalone-line trimming.

| Tag | Meaning |
| --- | --- |
| `{{expr}}` | value, HTML-escaped: `& < > " '` → `&amp; &lt; &gt; &quot; &#39;` |
| `{{{expr}}}`, `{{& expr}}` | value, not escaped |
| `{{#name}}…{{/name}}` | section |
| `{{^name}}…{{/name}}` | inverted section |
| `{{> name}}` | partial |
| `{{! anything }}` | comment, renders nothing |

## Lookup

- The renderer keeps a **context stack**, which starts as `[data]`.
- `.` is the top of the stack.
- For `a.b.c`, find the first segment as an own property of the nearest context, searching from the top of the stack down. Then follow the remaining segments as own properties of that value.
- Anything missing is `undefined`.
- Only own properties count, and `__proto__`, `constructor` and `prototype` are never found. So `{{constructor}}` renders empty.
- `undefined` and `null` render as `''`. Everything else renders with `String(v)`.

## Sections

- A value is *empty* if it's falsy or an empty array.
- In a section `{{#x}}`:
  - an empty value renders nothing;
  - an array renders the body once per item, with that item pushed onto the stack;
  - any other value renders the body once, with the value pushed.
- An inverted section renders its body (with the stack unchanged) only when the value is empty.

## Partials and helpers

**Partials**
- A partial renders the named template from `partials` with the current stack.
- A missing partial renders `''`.
- Partials may recurse. Rendering a partial more than 100 levels deep throws a `TemplateError` whose message contains `Partial depth limit exceeded`.

**Helpers**
- If the first word of a variable tag names a helper, call it with the remaining words as arguments:
  - `"quoted"` or `'quoted'` strings (where a backslash escapes the next character);
  - numbers (`-?\d+(\.\d+)?`);
  - anything else as a lookup.
- Helpers apply even with zero arguments, and take precedence over data. The result is rendered like a value (escaped unless the tag is raw).
- A tag with several words whose first word isn't a helper throws a `TemplateError` with ``Unknown helper "<word>"`` at render time.

## Errors

`TemplateError`'s message is ``<problem> (line L, column C)``. `line` and `column` are 1-based and point at the `{{` of the tag responsible. Syntax errors are thrown by `compile` (and so by `render`) before any output:
- ``Unclosed tag``: a `{{` (or `{{{`) without its closing braces;
- ``Unclosed section "<name>"``: points at the opening tag;
- ``Unexpected closing tag "<name>"``: the closing tag doesn't match the innermost open section, or nothing is open.
