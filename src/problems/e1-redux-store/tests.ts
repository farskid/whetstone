import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Store';
const G2 = 'combineReducers';
const G3 = 'Middleware';
const G4 = 'Edge cases';

const counter = (state = 0, action: { type: string; by?: number }) =>
  action.type === 'inc' ? state + (action.by ?? 1) : action.type === 'dec' ? state - 1 : state;
const todos = (state: string[] = [], action: { type: string; text?: string }) =>
  action.type === 'add' ? [...state, action.text!] : state;

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'getState, dispatch returns the action, init fills defaults',
    run({ createStore, ActionTypes }, { expect }) {
      const seen: string[] = [];
      const store = createStore((s: number | undefined = 10, a: { type: string }) => { seen.push(a.type); return a.type === 'inc' ? s + 1 : s; });
      expect(seen).toEqual([ActionTypes.INIT]);
      expect(store.getState()).toBe(10);
      const action = { type: 'inc' };
      expect(store.dispatch(action)).toBe(action);
      expect(store.getState()).toBe(11);
      expect(createStore(counter, 5).getState(), 'preloaded state wins').toBe(5);
    },
  },
  {
    group: G1,
    title: 'subscribe, unsubscribe and invalid actions',
    run({ createStore }, { expect }) {
      const store = createStore(counter);
      const calls: number[] = [];
      const un = store.subscribe(() => calls.push(store.getState()));
      store.dispatch({ type: 'inc' });
      store.dispatch({ type: 'nothing' });
      un();
      un();
      store.dispatch({ type: 'inc' });
      expect(calls).toEqual([1, 1]);
      expect(() => store.dispatch('inc')).toThrow('Actions must be plain objects');
      expect(() => store.dispatch(new (class A { type = 'inc'; })())).toThrow('Actions must be plain objects');
      expect(() => store.dispatch({ kind: 'inc' })).toThrow('Actions must have a string type');
      expect(store.dispatch(Object.assign(Object.create(null), { type: 'inc' })).type).toBe('inc');
      expect(store.getState()).toBe(3);
    },
  },
  {
    group: G2,
    title: 'slices get their defaults from the init action',
    run({ createStore, combineReducers }, { expect }) {
      const store = createStore(combineReducers({ counter, todos }));
      expect(store.getState()).toEqual({ counter: 0, todos: [] });
      store.dispatch({ type: 'add', text: 'x' });
      store.dispatch({ type: 'inc', by: 2 });
      expect(store.getState()).toEqual({ counter: 2, todos: ['x'] });
      const partial = createStore(combineReducers({ counter, todos }), { counter: 7 } as any);
      expect(partial.getState()).toEqual({ counter: 7, todos: [] });
    },
  },
  {
    group: G2,
    title: 'unchanged slices keep references; undefined from a slice throws',
    run({ combineReducers }, { expect }) {
      const root = combineReducers({ counter, todos });
      const s1 = root(undefined, { type: '@@init' });
      expect(root(s1, { type: 'unknown' }), 'unknown action returns the same object').toBe(s1);
      const s2 = root(s1, { type: 'inc' });
      expect(s2).not.toBe(s1);
      expect(s2.todos, 'untouched slice is shared').toBe(s1.todos);
      const withExtra = { ...s1, stale: true };
      expect(root(withExtra, { type: 'unknown' }), 'extra keys are dropped').toEqual({ counter: 0, todos: [] });
      const bad = combineReducers({ ok: counter, broken: (() => undefined) as any });
      expect(() => bad(undefined, { type: 'x' })).toThrow('Reducer "broken" returned undefined');
    },
  },
  {
    group: G3,
    title: 'compose runs right to left; compose() is identity',
    run({ compose }, { expect }) {
      const f = compose((x: string) => `f(${x})`, (x: string) => `g(${x})`, (a: string, b: string) => a + b);
      expect(f('a', 'b')).toBe('f(g(ab))');
      expect(compose()(42)).toBe(42);
      const one = (x: number) => x + 1;
      expect(compose(one)(1)).toBe(2);
    },
  },
  {
    group: G3,
    title: 'middleware order, thunks re-enter the whole chain',
    run({ createStore, applyMiddleware }, { expect }) {
      const log: string[] = [];
      const logger = (name: string) => (api: any) => (next: any) => (action: any) => {
        log.push(`${name}>${typeof action === 'function' ? 'fn' : action.type}`);
        const r = next(action);
        log.push(`${name}<${api.getState()}`);
        return r;
      };
      const thunk = (api: any) => (next: any) => (action: any) =>
        typeof action === 'function' ? action(api.dispatch, api.getState) : next(action);
      const store = createStore(counter, applyMiddleware(logger('A'), thunk, logger('B')));
      const result = store.dispatch((dispatch: any, getState: any) => { dispatch({ type: 'inc' }); return getState() * 10; });
      expect(result).toBe(10);
      expect(log).toEqual(['A>fn', 'A>inc', 'B>inc', 'B<1', 'A<1', 'A<1']);
      expect(createStore(counter, 3, applyMiddleware()).getState(), 'preloaded state with an enhancer').toBe(3);
    },
  },
  {
    group: G3,
    title: 'dispatching while constructing middleware throws',
    run({ createStore, applyMiddleware }, { expect }) {
      const eager = (api: any) => { api.dispatch({ type: 'inc' }); return (next: any) => next; };
      expect(() => createStore(counter, applyMiddleware(eager))).toThrow('Dispatching while constructing your middleware is not allowed');
      let saved: any;
      const later = (api: any) => { saved = api; return (next: any) => next; };
      const store = createStore(counter, applyMiddleware(later));
      saved.dispatch({ type: 'inc' });
      expect(store.getState(), 'the same api works after setup').toBe(1);
    },
  },
  {
    group: G4,
    title: 'listeners are snapshotted per dispatch',
    run({ createStore }, { expect }) {
      const store = createStore(counter);
      const log: string[] = [];
      let unB = () => {};
      store.subscribe(() => { log.push('a'); unB(); store.subscribe(() => log.push('late')); });
      unB = store.subscribe(() => log.push('b'));
      store.dispatch({ type: 'inc' });
      expect(log, 'b still runs this time; late does not').toEqual(['a', 'b']);
      log.length = 0;
      store.dispatch({ type: 'inc' });
      expect(log).toEqual(['a', 'late']);
    },
  },
  {
    group: G4,
    title: 'nested dispatch from a listener: inner snapshot first, latest state everywhere',
    run({ createStore }, { expect }) {
      const store = createStore(counter);
      const log: string[] = [];
      store.subscribe(() => { log.push(`1:${store.getState()}`); if (store.getState() === 1) store.dispatch({ type: 'inc' }); });
      store.subscribe(() => log.push(`2:${store.getState()}`));
      store.dispatch({ type: 'inc' });
      expect(log).toEqual(['1:1', '1:2', '2:2', '2:2']);
    },
  },
  {
    group: G4,
    title: 'reducers may not dispatch, read or subscribe',
    run({ createStore }, { expect }) {
      let store: any;
      const make = (fn: () => void) => {
        store = createStore((s: number = 0, a: { type: string }) => { if (a.type === 'bad') fn(); return s; });
        return store;
      };
      expect(() => make(() => store.dispatch({ type: 'x' })).dispatch({ type: 'bad' })).toThrow('Reducers may not dispatch actions');
      expect(() => make(() => store.getState()).dispatch({ type: 'bad' })).toThrow();
      expect(() => make(() => store.subscribe(() => {})).dispatch({ type: 'bad' })).toThrow();
      const s = make(() => { throw new Error('boom'); });
      expect(() => s.dispatch({ type: 'bad' })).toThrow('boom');
      s.dispatch({ type: 'fine' });
      expect(s.getState(), 'the store still works after a reducer threw').toBe(0);
    },
  },
  {
    group: G4,
    title: 'replaceReducer dispatches REPLACE and keeps listeners',
    run({ createStore, combineReducers, ActionTypes }, { expect }) {
      const store = createStore(combineReducers({ counter }));
      store.dispatch({ type: 'inc' });
      const calls: unknown[] = [];
      store.subscribe(() => calls.push(store.getState()));
      const types: string[] = [];
      store.replaceReducer(combineReducers({ counter, todos: (s: string[] = ['seed'], a: { type: string }) => { types.push(a.type); return s; } }));
      expect(types).toEqual([ActionTypes.REPLACE]);
      expect(store.getState()).toEqual({ counter: 1, todos: ['seed'] });
      expect(calls).toEqual([{ counter: 1, todos: ['seed'] }]);
    },
  },
];
