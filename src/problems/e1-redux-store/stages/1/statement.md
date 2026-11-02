Rebuild the core of Redux, starting with `createStore` and the constant `ActionTypes = { INIT: '@@redux/INIT', REPLACE: '@@redux/REPLACE' }`.

```ts
const counter = (state = 0, action) => (action.type === 'inc' ? state + 1 : state);
const store = createStore(counter);
store.subscribe(() => console.log(store.getState()));
store.dispatch({ type: 'inc' });   // logs 1
```

```ts
interface Store<S> {
  getState(): S;
  dispatch(action: any): any;
  subscribe(listener: () => void): () => void;
}

function createStore<S>(reducer: Reducer<S>, preloadedState?: S): Store<S>;
```

- **On creation** the store dispatches `{ type: ActionTypes.INIT }`, so the reducer fills in its default. A preloaded state wins over the default. <!-- tests: getState, dispatch returns the action, init fills defaults -->
- **`getState()`** returns the current state. <!-- tests: getState, dispatch returns the action, init fills defaults -->
- **`dispatch(action)`** runs the reducer, then calls the listeners, and returns the action. <!-- tests: getState, dispatch returns the action, init fills defaults | subscribe, unsubscribe and invalid actions -->
- **`subscribe(listener)`** returns an `unsubscribe` function. Calling it twice is harmless. <!-- tests: subscribe, unsubscribe and invalid actions -->

| Situation | Error message |
| --- | --- |
| The action isn't a plain object (its prototype is neither `Object.prototype` nor `null`) | `Actions must be plain objects` <!-- tests: subscribe, unsubscribe and invalid actions --> |
| `type` isn't a string | `Actions must have a string type` <!-- tests: subscribe, unsubscribe and invalid actions --> |
