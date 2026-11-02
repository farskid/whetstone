Add enhancers and middleware.

```ts
const store = createStore(combineReducers({ counter }), applyMiddleware(thunk));

function createStore<S>(reducer: Reducer<S>, preloadedState?: S | Enhancer, enhancer?: Enhancer): Store<S>;
function compose(...fns: Function[]): Function;
function applyMiddleware(...middlewares: Middleware[]): Enhancer;
```

**`createStore` arguments**
- If the second argument is a function and there is no third, it's the enhancer. <!-- tests: middleware order, thunks re-enter the whole chain -->
- With an enhancer, return `enhancer(createStore)(reducer, preloadedState)`. <!-- tests: middleware order, thunks re-enter the whole chain -->

**`compose(...fns)`**
- `compose(f, g, h)(...args)` is `f(g(h(...args)))`. <!-- tests: compose runs right to left; compose() is identity -->
- `compose()` is the identity function. <!-- tests: compose runs right to left; compose() is identity -->

**`applyMiddleware(...middlewares)`** returns an enhancer. Each middleware is `({ getState, dispatch }) => next => action => …`.
- The chain runs in argument order: the first middleware sees the action first, and the last one's `next` is the store's `dispatch`. <!-- tests: middleware order, thunks re-enter the whole chain -->
- The `dispatch` given to a middleware goes through the **whole** chain, so a thunk that dispatches is seen by the logger again. <!-- tests: middleware order, thunks re-enter the whole chain -->
- Calling that `dispatch` while the middlewares are being set up throws `Dispatching while constructing your middleware is not allowed`. <!-- tests: dispatching while constructing middleware throws -->
