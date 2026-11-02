Write the part of npm's `semver` package that parses and orders versions.

```ts
parse('1.2.3-alpha.1+build.05');
// { major: 1, minor: 2, patch: 3, prerelease: ['alpha', 1], build: ['build', '05'] }
compare('1.0.0-alpha', '1.0.0');   // -1
```

```ts
interface SemVer { major: number; minor: number; patch: number; prerelease: Array<string | number>; build: string[] }
function parse(input: string): SemVer | null;
function compare(a: string, b: string): -1 | 0 | 1;
```

**Versions**
- A version is `MAJOR.MINOR.PATCH`, optionally followed by `-prerelease` and `+build`, with an optional leading `v`. Surrounding whitespace is ignored.
- Numbers have no leading zeros.
- Prerelease and build parts are dot-separated, non-empty identifiers made of `[0-9A-Za-z-]`. A numeric prerelease identifier can't have leading zeros; build identifiers can (`05`).
- `parse` returns `{ major, minor, patch, prerelease, build }`, where all-digit prerelease identifiers become numbers. It returns `null` for anything invalid (never throws).

**`compare(a, b)`** returns `-1`, `0` or `1`, and throws a `TypeError` whose message starts with `Invalid version` for an invalid version.
- Compare major, minor and patch numerically.
- A version with a prerelease is lower than the same version without one.
- Prerelease identifiers are compared left to right:
  - numbers are compared numerically;
  - numbers sort below strings;
  - strings are compared in ASCII order;
  - if all shared identifiers are equal, the shorter list is lower.
- Build metadata is ignored.
