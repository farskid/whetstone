Add enhancers and middleware.

```ts
const store = createStore(combineReducers({ counter }), applyMiddleware(thunk));

function createStore<S>(reducer: Reducer<S>, preloadedState?: S | Enhancer, enhancer?: Enhancer): Store<S>;
function compose(...fns: Function[]): Function;
function applyMiddleware(...middlewares: Middleware[]): Enhancer;
```

**`createStore` arguments**
- If the second argument is a function and there is no third, it's the enhancer.
- With an enhancer, return `enhancer(createStore)(reducer, preloadedState)`.

**`compose(...fns)`**
- `compose(f, g, h)(...args)` is `f(g(h(...args)))`.
- `compose()` is the identity function.

**`applyMiddleware(...middlewares)`** returns an enhancer. Each middleware is `({ getState, dispatch }) => next => action => …`.
- The chain runs in argument order: the first middleware sees the action first, and the last one's `next` is the store's `dispatch`.
- The `dispatch` given to a middleware goes through the **whole** chain, so a thunk that dispatches is seen by the logger again.
- Calling that `dispatch` while the middlewares are being set up throws `Dispatching while constructing your middleware is not allowed`.
