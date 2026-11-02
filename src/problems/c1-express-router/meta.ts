import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'c1-express-router',
  catalogId: 'C1',
  title: 'Express router with error middleware',
  theme: 'Middleware',
  difficulty: 'Medium',
  inspiredBy: 'Express',
  tags: [
    { kind: 'framework', name: 'Express' },
    { kind: 'pattern', name: 'Middleware' },
    { kind: 'pattern', name: 'Routing' },
    { kind: 'pattern', name: 'Error handling' },
  ],
  summary: 'next() chaining, path-scoped middleware and :param routes, 4-arity error handlers that can recover, async handlers, and mountable sub-routers.',
  stages: [
    { title: 'Middleware chain', summary: 'use(fn) and handle(req, res) with next() chaining.', groups: ['Middleware chain'] },
    { title: 'Paths and routes', summary: 'Path-scoped use with baseUrl, get/post with :params, next("route").', groups: ['Paths and routes'] },
    { title: 'Error middleware', summary: 'next(err) jumps to (err, req, res, next) handlers, which can recover with next().', groups: ['Error middleware'] },
    { title: 'Async and sub-routers', summary: 'Rejected promises become errors; a router is middleware, so routers mount inside routers; next("router").', groups: ['Async and sub-routers'] },
  ],
};
