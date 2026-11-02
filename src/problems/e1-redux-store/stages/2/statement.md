```ts
function combineReducers(reducers: Record<string, Reducer>): Reducer<Record<string, any>>;
```

Returns a reducer that calls every slice reducer with `state[key]` and the action.

- A slice reducer that returns `undefined` throws `Reducer "<key>" returned undefined …`.
- If no slice changed (`===`) and the state has exactly the reducers' keys, return the **same** state object. Otherwise return a new object containing only the reducers' keys.
