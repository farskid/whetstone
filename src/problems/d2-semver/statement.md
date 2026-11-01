# Semver ranges

Write the part of npm's `semver` package that decides which versions a dependency range accepts.

```ts
compare('1.0.0-alpha', '1.0.0');                  // -1
satisfies('1.4.2', '^1.2.3');                     // true
satisfies('0.0.4', '^0.0.3');                     // false
maxSatisfying(['1.2.3', '1.10.0', '2.0.0'], '~1.2 || 1.10.x'); // '1.10.0'
```

## Versions

- A version is `MAJOR.MINOR.PATCH`, optionally followed by `-prerelease` and `+build`, with an optional leading `v`. Surrounding whitespace is ignored.
- Numbers have no leading zeros.
- Prerelease and build parts are dot-separated identifiers made of `[0-9A-Za-z-]`, and a numeric prerelease identifier can't have leading zeros.
- `parse` returns `{ major, minor, patch, prerelease, build }`, where numeric prerelease identifiers become numbers. It returns `null` for anything invalid (never throws).

**`compare(a, b)`** returns `-1`, `0` or `1`, and throws a `TypeError` for an invalid version.
- Compare major, minor and patch numerically.
- A version with a prerelease is lower than the same version without one.
- Prerelease identifiers are compared left to right:
  - numbers are compared numerically;
  - numbers sort below strings;
  - strings are compared in ASCII order;
  - if all shared identifiers are equal, the shorter list is lower.
- Build metadata is ignored.

## Ranges

A range is one or more comparator sets joined by `||`. A version satisfies the range if it satisfies any set. A set is satisfied when **all** of its whitespace-separated comparators are.

A *partial* version may leave out minor/patch, or use `x`, `X` or `*` for them. `1.2.3` is full. `1.2`, `1.x` and `1` are partial.

| Form | Means |
| --- | --- |
| `1.2.3` or `=1.2.3` | exactly 1.2.3 |
| `1.2` / `1.2.x` | `>=1.2.0 <1.3.0` |
| `1` / `1.x` | `>=1.0.0 <2.0.0` |
| `*`, `x`, or an empty set | any version |
| `>=1.2` / `<1.2` | `>=1.2.0` / `<1.2.0` |
| `>1.2` / `<=1.2` | `>=1.3.0` / `<1.3.0` (above / within everything `1.2` covers) |
| `~1.2.3` / `~1.2` | `>=1.2.3 <1.3.0` / `>=1.2.0 <1.3.0` |
| `~1` | `>=1.0.0 <2.0.0` |
| `^1.2.3`, `^1.2`, `^1` | `>=1.2.3 <2.0.0` etc.: don't change the left-most non-zero part |
| `^0.2.3` | `>=0.2.3 <0.3.0` |
| `^0.0.3` | `>=0.0.3 <0.0.4` |
| `^0.0` / `^0.0.x` | `>=0.0.0 <0.1.0` |
| `^0` / `^0.x` | `>=0.0.0 <1.0.0` |
| `1.2 - 2.3.4` | `>=1.2.0 <=2.3.4`. A partial right side means everything it covers: `1.2.3 - 2.3` is `>=1.2.3 <2.4.0` |

**Prereleases**
- Whitespace after an operator is allowed (`>= 1.2.0`).
- Full versions inside ranges may carry a prerelease (`>=1.2.4-alpha`, `^1.2.3-rc.1`).
- A version **with** a prerelease satisfies a set only if it passes every comparator **and** at least one comparator in that set has a prerelease on the same `major.minor.patch`. So `1.2.4-beta` satisfies `>=1.2.4-alpha`, but `1.2.5-beta` doesn't, and `^1.2.3` never matches `2.0.0-beta` or `1.5.0-rc.1`.

**Functions**
- `satisfies(version, range)` returns `false` (doesn't throw) if either input is invalid.
- `maxSatisfying(versions, range)` returns the highest matching string from the list. It skips invalid versions, and returns `null` if nothing matches or the range is invalid.
