Handle dependency cycles.

```ts
s.set('B1', '=B2');
s.set('B2', '=B1+1');   // ['B1', 'B2'], and both are { error: '#CYCLE!' }
s.set('B2', 5);         // ['B1', 'B2']: B1 is 5 again
```

- `ErrorCode` gains `'#CYCLE!'`.
- Cells that are on a dependency cycle, including a formula that references itself, get `#CYCLE!`. <!-- tests: cycles become #CYCLE! and recover when broken -->
- So do cells that depend on a cycle cell, even through an `IF` branch that isn't chosen.
- When a `set` breaks the cycle, recalculation brings real values back, and those cells are reported as changed. <!-- tests: cycles become #CYCLE! and recover when broken -->
