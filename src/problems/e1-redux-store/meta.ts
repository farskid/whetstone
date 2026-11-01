import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'e1-redux-store',
  catalogId: 'E1',
  title: 'Redux store',
  theme: 'State',
  difficulty: 'Medium',
  inspiredBy: 'Redux',
  tags: [
    { kind: 'library', name: 'Redux' },
    { kind: 'pattern', name: 'Reducers' },
    { kind: 'pattern', name: 'Middleware' },
    { kind: 'pattern', name: 'Flux' },
  ],
  summary: 'createStore, combineReducers, compose and applyMiddleware, with snapshot subscriptions, reducer re-entrancy guards and replaceReducer.',
  stages: [
    { title: 'Store', summary: 'createStore(reducer, initial) with getState/dispatch/subscribe and an init action.', groups: ['Store'] },
    { title: 'combineReducers', summary: 'Slice reducers, the same state reference when nothing changed.', groups: ['combineReducers'] },
    { title: 'Middleware', summary: 'applyMiddleware and compose; a middleware dispatch goes through the whole chain.', groups: ['Middleware'] },
    { title: 'Edge cases', summary: 'Snapshot listeners, dispatch inside a reducer throws, replaceReducer.', groups: ['Edge cases'] },
  ],
};
