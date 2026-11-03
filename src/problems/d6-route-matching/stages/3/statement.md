Add constrained and optional params.

```ts
r.add('GET', '/u/:id(\\d+)', 'num');
r.add('GET', '/u/:slug', 'slug');
r.match('GET', '/u/123');     // 'num'
r.match('GET', '/u/123abc');  // 'slug'
r.add('GET', '/posts/:year(\\d{4})?/:slug', 'post');
r.match('GET', '/posts/hello')?.params;  // { slug: 'hello' }
```

| segment | matches |
| --- | --- |
| `:id(\d+)` | one segment whose **decoded** value fully matches the regex, as `^(?:…)$` <!-- tests: constraints must match the whole segment | constraint alternation is fully anchored --> |
| `:id?` / `:id(\d+)?` | optional: the segment may be absent, and then `id` is **not a key** in `params` <!-- tests: optional params: present or absent (no key when absent) --> |

- A param name is `[A-Za-z_$][\w$]*`.
- A constrained param and a plain param both rank as "param". At the same position, they're tried in registration order (params with the same constraint count as one, tried where the first was registered).
- An optional param tries "present" first, as a normal param, before "absent". Either way, `pattern` is still the original string. <!-- tests: optional params: present or absent (no key when absent) -->
- Patterns are still well-formed in this stage.
