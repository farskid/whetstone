Add prerelease matching and `maxSatisfying`.

```ts
satisfies('1.2.4-beta', '>=1.2.4-alpha');   // true
satisfies('2.0.0-beta', '^1.2.3');          // false
maxSatisfying(['1.2.3', '1.10.0', '2.0.0'], '~1.2 || 1.10.x'); // '1.10.0'

function maxSatisfying(versions: string[], range: string): string | null;
```

**Prereleases**
- Full versions inside ranges may carry a prerelease (`>=1.2.4-alpha`, `^1.2.3-rc.1`, `1.2.3-beta.2 - 1.2.3`), and they compare as in stage 1. Build metadata on them is ignored.
- A version **with** a prerelease satisfies a set only if it passes every comparator **and** at least one comparator in that set has a prerelease on the same `major.minor.patch`. <!-- tests: prereleases match only when a comparator opts in on the same tuple -->
- So `1.2.4-beta` satisfies `>=1.2.4-alpha`, but `1.2.5-beta` doesn't, and `^1.2.3` never matches `2.0.0-beta` or `1.5.0-rc.1`. <!-- tests: prereleases match only when a comparator opts in on the same tuple -->
- Versions without a prerelease are unaffected.

**`maxSatisfying(versions, range)`**
- Returns the highest matching string from the list, exactly as given. <!-- tests: maxSatisfying picks the highest match and skips invalid versions -->
- It skips invalid versions, and returns `null` if nothing matches or the range is invalid. <!-- tests: maxSatisfying picks the highest match and skips invalid versions -->
- When two matches are equal (they differ only in build metadata), the earlier one wins.
