import type { Request, Response, Handler, Router } from './types';

interface Layer {
  route: boolean;
  method?: string;
  prefix: string;
  regex?: RegExp;
  keys?: string[];
  fns: Handler[];
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

function once<A extends unknown[]>(fn: (...a: A) => void): (...a: A) => void {
  let called = false;
  return (...a) => { if (called) return; called = true; fn(...a); };
}

export function createRouter(): Router {
  const layers: Layer[] = [];

  const run = (req: Request, res: Response, out: () => void) => {
    const parentUrl = req.url;
    const parentBase = req.baseUrl ?? '';
    let i = 0;

    const next = (): void => {
      req.url = parentUrl;
      req.baseUrl = parentBase;
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
          const step = (signal?: 'route'): void => {
            if (signal === 'route' || h >= layer.fns.length) return next();
            layer.fns[h++](req, res, once(step));
          };
          return step();
        }
        const p = layer.prefix;
        if (p !== '' && path !== p && !path.startsWith(p + '/')) continue;
        if (p !== '') {
          req.baseUrl = parentBase + p;
          req.url = (path.slice(p.length) || '/') + query;
        }
        layer.fns[0](req, res, once(next));
        return;
      }
      out();
    };
    next();
  };

  const router = {} as Router;
  const add = (method: string) => (path: string, ...fns: Handler[]) => {
    layers.push({ route: true, method, prefix: path, ...compile(path), fns });
    return router;
  };

  router.use = (pathOrFn: string | Handler, ...fns: Handler[]) => {
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
      run(req, res, () => {
        res.statusCode = 404;
        res.end(`Cannot ${req.method.toUpperCase()} ${splitUrl(req.originalUrl!)[0]}`);
      });
    });

  return router;
}
