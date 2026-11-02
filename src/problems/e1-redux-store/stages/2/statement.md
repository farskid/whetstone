```ts
function combineReducers(reducers: Record<string, Reducer>): Reducer<Record<string, any>>;
```

Returns a reducer that calls every slice reducer with `state[key]` and the action. <!-- tests: slices get their defaults from the init action -->

- A slice reducer that returns `undefined` throws `Reducer "<key>" returned undefined …`. <!-- tests: unchanged slices keep references; undefined from a slice throws -->
- If no slice changed (`===`) and the state has exactly the reducers' keys, return the **same** state object. Otherwise return a new object containing only the reducers' keys. <!-- tests: unchanged slices keep references; undefined from a slice throws -->
