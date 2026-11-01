# Redux store

Rebuild the core of Redux: `createStore`, `combineReducers`, `compose` and `applyMiddleware`, plus the constant `ActionTypes = { INIT: '@@redux/INIT', REPLACE: '@@redux/REPLACE' }`.

```ts
const counter = (state = 0, action) => (action.type === 'inc' ? state + 1 : state);
const store = createStore(combineReducers({ counter }), applyMiddleware(thunk));
store.subscribe(() => console.log(store.getState()));
store.dispatch({ type: 'inc' });   // logs { counter: 1 }
```

## `createStore(reducer, preloadedState?, enhancer?)`

**Arguments**
- If the second argument is a function and there is no third, it's the enhancer.
- With an enhancer, return `enhancer(createStore)(reducer, preloadedState)`.

**On creation** the store dispatches `{ type: ActionTypes.INIT }`, so reducers fill in their defaults. No listeners exist yet.

**`getState()`** returns the current state.

**`dispatch(action)`**
- It returns the action.
- It runs the reducer, then calls the listeners.

**Errors**

| Situation | Error message |
| --- | --- |
| The action isn't a plain object (its prototype is neither `Object.prototype` nor `null`) | `Actions must be plain objects` |
| `type` isn't a string | `Actions must have a string type` |
| `dispatch` called while a reducer runs | `Reducers may not dispatch actions` |
| `getState`, `subscribe` or an unsubscribe called while a reducer runs | an error (any message) |

**`subscribe(listener)`** returns an `unsubscribe` function. Calling it twice is harmless.

Listeners are **snapshotted per dispatch**: each dispatch calls exactly the listeners that were subscribed when its reducer finished.
- A listener that unsubscribes another during a dispatch doesn't stop that one from being called this time.
- A listener added during a dispatch is first called on the next dispatch.

A listener may dispatch:
- The nested dispatch runs fully, notifying its own snapshot, before the outer dispatch continues with the rest of its listeners.
- Listeners always read the latest state through `getState()`.

**`replaceReducer(next)`** swaps the reducer and dispatches `{ type: ActionTypes.REPLACE }`.

## `combineReducers(reducers)`

Returns a reducer that calls every slice reducer with `state[key]` and the action.

- A slice reducer that returns `undefined` throws `Reducer "<key>" returned undefined …`.
- If no slice changed (`===`) and the state has exactly the reducers' keys, return the **same** state object. Otherwise return a new object containing only the reducers' keys.

## `compose(...fns)`

- `compose(f, g, h)(...args)` is `f(g(h(...args)))`.
- `compose()` is the identity function.

## `applyMiddleware(...middlewares)`

Returns an enhancer. Each middleware is `({ getState, dispatch }) => next => action => …`.

- The chain runs in argument order: the first middleware sees the action first, and the last one's `next` is the store's `dispatch`.
- The `dispatch` given to a middleware goes through the **whole** chain, so a thunk that dispatches is seen by the logger again.
- Calling that `dispatch` while the middlewares are being set up throws `Dispatching while constructing your middleware is not allowed`.
