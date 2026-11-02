import type { Request, Response, Next, Handler, ErrorHandler, Fn, Router } from './types';

interface Layer {
  route: boolean;
  method?: string;
  prefix: string;
  regex?: RegExp;
  keys?: string[];
  fns: Fn[];
}

function splitUrl(url: string): [string, string] {
  const q = url.indexOf('?');
  return q < 0 ? [url, ''] : [url.slice(0, q), url.slice(q)];
}

function compile(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const src = trimmed
    .split('/')
    .map((seg) => (seg.startsWith(':') ? (keys.push(seg.slice(1)), '([^/]+)') : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return { regex: new RegExp(`^${src === '/' ? '' : src}/?$`), keys };
}

function invoke(fn: Fn, err: unknown, req: Request, res: Response, next: Next) {
  const isErrorHandler = fn.length === 4;
  if (err !== undefined) {
    if (!isErrorHandler) return next(err);
  } else if (isErrorHandler) return next();
  try {
    const out = err !== undefined ? (fn as ErrorHandler)(err, req, res, next) : (fn as Handler)(req, res, next);
    if (out && typeof (out as any).then === 'function') {
      (out as Promise<unknown>).then(undefined, (e) => next(e ?? new Error('Rejected')));
    }
  } catch (e) {
    next(e);
  }
}

function once(fn: Next): Next {
  let called = false;
  return (err) => { if (called) return; called = true; fn(err); };
}

const isErr = (e: unknown) => e !== undefined && e !== null;

export function createRouter(): Router {
  const layers: Layer[] = [];

  const run = function (req: Request, res: Response, out: Next) {
    const parentUrl = req.url;
    const parentBase = req.baseUrl ?? '';
    let i = 0;

    const next = (incoming?: unknown): void => {
      req.url = parentUrl;
      req.baseUrl = parentBase;
      const err = incoming === 'route' || !isErr(incoming) ? undefined : incoming;
      const [path, query] = splitUrl(req.url);
      while (i < layers.length) {
        const layer = layers[i++];
        if (layer.route) {
          if (layer.method !== 'ALL' && layer.method !== req.method.toUpperCase()) continue;
          const m = layer.regex!.exec(path);
          if (!m) continue;
          const params: Record<string, string> = {};
          layer.keys!.forEach((k, j) => { params[k] = decodeURIComponent(m[j + 1]); });
          req.params = params;
          let h = 0;
          const step = (e?: unknown): void => {
            if (e === 'route') return next();
            const cur = isErr(e) ? e : undefined;
            if (h >= layer.fns.length) return next(cur);
            invoke(layer.fns[h++], cur, req, res, once(step));
          };
          return step(err);
        }
        const p = layer.prefix;
        if (p !== '' && path !== p && !path.startsWith(p + '/')) continue;
        if (p !== '') {
          req.baseUrl = parentBase + p;
          req.url = (path.slice(p.length) || '/') + query;
        }
        return invoke(layer.fns[0], err, req, res, once(next));
      }
      out(err);
    };
    next();
  };

  const router = {} as Router;

  const add = (method: string) => (path: string, ...fns: Fn[]) => {
    layers.push({ route: true, method, prefix: path, ...compile(path), fns });
    return router;
  };

  router.use = (pathOrFn: string | Fn, ...fns: Fn[]) => {
    let prefix = '';
    if (typeof pathOrFn === 'string') prefix = pathOrFn.replace(/\/+$/, '');
    else fns.unshift(pathOrFn);
    for (const fn of fns) layers.push({ route: false, prefix, fns: [fn] });
    return router;
  };
  router.get = add('GET');
  router.post = add('POST');
  router.put = add('PUT');
  router.delete = add('DELETE');
  router.all = add('ALL');

  router.handle = (req, res) =>
    new Promise<void>((resolve) => {
      const end = res.end;
      res.end = (body?: unknown) => { res.end = end; end.call(res, body); resolve(); };
      req.originalUrl ??= req.url;
      req.baseUrl = '';
      req.params ??= {};
      run(req, res, (err) => {
        if (isErr(err)) {
          const status = (err as any)?.status;
          res.statusCode = typeof status === 'number' ? status : 500;
          res.end(err instanceof Error ? err.message : String(err));
        } else {
          res.statusCode = 404;
          res.end(`Cannot ${req.method.toUpperCase()} ${splitUrl(req.originalUrl!)[0]}`);
        }
      });
    });

  return router;
}
