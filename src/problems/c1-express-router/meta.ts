import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c1-express-router',
  catalogId: 'C1',
  title: 'Express router with error middleware',
  theme: 'Middleware',
  difficulty: 'Medium',
  inspiredBy: 'Express',
  summary: 'next() chaining, path-scoped middleware and :param routes, 4-arity error handlers that can recover, async handlers, and mountable sub-routers.',
  stages: [
    { title: 'Middleware chain', summary: 'use(fn) and handle(req, res) with next() chaining.' },
    { title: 'Paths and routes', summary: 'Path-scoped use, get/post with :params, next("route").' },
    { title: 'Error middleware', summary: 'next(err) jumps to (err, req, res, next) handlers, which can recover with next().' },
    { title: 'Async and sub-routers', summary: 'Rejected promises become errors; mounted routers see baseUrl and a stripped url.' },
  ],
};
