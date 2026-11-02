import type { Handler, Router } from './types';

const pathOf = (url: string) => { const q = url.indexOf('?'); return q < 0 ? url : url.slice(0, q); };

export function createRouter(): Router {
  const fns: Handler[] = [];
  const router: Router = {
    use(...more) { fns.push(...more); return router; },
    handle(req, res) {
      return new Promise<void>((resolve) => {
        const end = res.end;
        res.end = (body?: unknown) => { res.end = end; end.call(res, body); resolve(); };
        let i = 0;
        const next = (): void => {
          if (i >= fns.length) {
            res.statusCode = 404;
            res.end(`Cannot ${req.method.toUpperCase()} ${pathOf(req.url)}`);
            return;
          }
          let called = false;
          fns[i++](req, res, () => { if (!called) { called = true; next(); } });
        };
        next();
      });
    },
  };
  return router;
}
