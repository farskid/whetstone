Add `satisfies` for ranges made of comparators.

```ts
satisfies('1.4.2', '^1.2.3');        // true
satisfies('0.0.4', '^0.0.3');        // false
satisfies('1.5.0', '>=1.2.0 <2');    // true

function satisfies(version: string, range: string): boolean;
```

A range is one or more whitespace-separated comparators, and a version satisfies it when it satisfies **all** of them. Whitespace after an operator is allowed (`>= 1.2.0`).

A comparator is an operator followed by a version (optional leading `v`). After an operator the version may be *partial*: it may leave out minor/patch, or use `x`, `X` or `*` for them. `1.2.3` is full; `1.2`, `1.x` and `1` are partial. The major part must be a number.

| Form | Means |
| --- | --- |
| `1.2.3` or `=1.2.3` | exactly 1.2.3 (a comparator without an operator must be a full version) |
| `>=1.2` / `<1.2` | `>=1.2.0` / `<1.2.0` |
| `>1.2` / `<=1.2` | `>=1.3.0` / `<1.3.0` (above / within everything `1.2` covers) |
| `~1.2.3` / `~1.2` | `>=1.2.3 <1.3.0` / `>=1.2.0 <1.3.0` |
| `~1` | `>=1.0.0 <2.0.0` |
| `^1.2.3`, `^1.2`, `^1` | `>=1.2.3 <2.0.0` etc.: don't change the left-most non-zero part |
| `^0.2.3` | `>=0.2.3 <0.3.0` |
| `^0.0.3` | `>=0.0.3 <0.0.4` |
| `^0.0` / `^0.0.x` | `>=0.0.0 <0.1.0` |
| `^0` / `^0.x` | `>=0.0.0 <1.0.0` |

- Build metadata in the version is ignored, so `1.2.3+build` satisfies `=1.2.3`.
- `satisfies` returns `false` (doesn't throw) if the version or the range is invalid. An empty range is invalid in this stage.
- In this stage, neither the versions nor the ranges have prereleases.
