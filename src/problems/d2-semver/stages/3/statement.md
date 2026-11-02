Add x-ranges, hyphen ranges and `||` unions.

```ts
satisfies('1.10.0', '~1.2 || 1.10.x');   // true
satisfies('2.3.9', '1.2.3 - 2.3');       // true
```

- A range is now one or more comparator sets joined by `||`. A version satisfies the range if it satisfies any set. A set is the stage 2 list of comparators, ANDed.
- A comparator **without** an operator may now be partial. It means everything it covers:

| Form | Means |
| --- | --- |
| `1.2` / `1.2.x` | `>=1.2.0 <1.3.0` |
| `1` / `1.x` | `>=1.0.0 <2.0.0` |
| `*`, `x`, or an empty set | any version |
| `1.2 - 2.3.4` | `>=1.2.0 <=2.3.4`. A partial right side means everything it covers: `1.2.3 - 2.3` is `>=1.2.3 <2.4.0` |

- The major part may now be `x`, `X` or `*` too (the rest is then ignored). With `<` or `>` that matches nothing; with any other operator it matches everything.
- A hyphen range is a whole set: two operator-free versions separated by ` - ` (spaces around the hyphen). Anything else around it, like `>=1.0.0 - 2`, makes the range invalid.
- A set whose tokens don't all parse makes the whole range invalid, so `satisfies` returns `false`.
- Still no prereleases in this stage.
