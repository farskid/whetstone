Write the variable part of a Mustache-style template engine.

```ts
render('<h1>{{title}}</h1> by {{user.name}}', { title: 'Books & more', user: { name: 'Ada' } });
// '<h1>Books &amp; more</h1> by Ada'
```

```ts
function render(template: string, data: unknown): string;
```

**Tags**

| Tag | Meaning |
| --- | --- |
| `{{expr}}` | value, HTML-escaped: `& < > " '` → `&amp; &lt; &gt; &quot; &#39;` <!-- tests: variables are escaped; raw tags are not; missing renders empty --> |
| `{{{expr}}}`, `{{& expr}}` | value, not escaped <!-- tests: variables are escaped; raw tags are not; missing renders empty --> |
| `{{! anything }}` | comment, renders nothing |

- Whitespace just inside a tag is ignored (`{{ name }}`).
- Text outside tags is copied exactly, including newlines and spaces.
- In this stage, templates are well-formed and use only these tags.

**Lookup**
- `expr` is a path like `name` or `a.b.c`. Follow each segment as an own property, starting from `data`. <!-- tests: dotted paths follow own properties only -->
- Anything missing (or reached through a non-object) is `undefined`. <!-- tests: variables are escaped; raw tags are not; missing renders empty | dotted paths follow own properties only -->
- Only own properties count, and `__proto__`, `constructor` and `prototype` are never found. So `{{constructor}}` and `{{user.toString}}` render empty. <!-- tests: dotted paths follow own properties only -->
- `undefined` and `null` render as `''`. Everything else renders with `String(v)`, so `0` → `'0'` and `false` → `'false'`.
