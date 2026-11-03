import type { LoaderContext, RunOptions, RunResult, ParsedLoader } from './types';

export function parseLoader(request: string): ParsedLoader {
  const q = request.indexOf('?');
  if (q < 0) return { name: request, options: {} };
  const name = request.slice(0, q);
  const query = request.slice(q + 1);
  if (query.startsWith('{')) return { name, options: JSON.parse(query) };
  const options: Record<string, unknown> = {};
  for (const [k, v] of new URLSearchParams(query)) options[k] = v;
  return { name, options };
}

function call(fn: (...a: any[]) => unknown, ctx: LoaderContext, args: unknown[]): Promise<{ value: unknown; returned: boolean }> {
  return new Promise((resolve, reject) => {
    let isAsync = false;
    let done = false;
    ctx.async = () => {
      isAsync = true;
      return (err?: unknown, result?: unknown) => {
        if (done) throw new Error('The async callback was already called');
        done = true;
        if (err) reject(err); else resolve({ value: result, returned: true });
      };
    };
    let out: unknown;
    try {
      out = fn.apply(ctx, args);
    } catch (e) {
      if (!done) { done = true; reject(e); }
      return;
    }
    if (isAsync) return;
    done = true;
    if (out && typeof (out as any).then === 'function') {
      (out as Promise<unknown>).then((v) => resolve({ value: v, returned: true }), reject);
    } else resolve({ value: out, returned: out !== undefined });
  });
}

function wrap(name: string, e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  return new Error(`${name}: ${msg}`, { cause: e });
}

export async function runLoaders(opts: RunOptions): Promise<RunResult> {
  const loaders = opts.loaders.map((request) => {
    const { name, options } = parseLoader(request);
    const fn = opts.registry[name];
    if (!fn) throw new Error(`Unknown loader ${name}`);
    const ctx: LoaderContext = {
      resourcePath: opts.resource,
      options,
      async: () => { throw new Error('async() called outside a loader'); },
    };
    return { name, fn, ctx };
  });

  let value = await opts.readResource(opts.resource);
  for (let i = loaders.length - 1; i >= 0; i--) {
    const l = loaders[i];
    let r: { value: unknown; returned: boolean };
    try {
      r = await call(l.fn, l.ctx, [value]);
    } catch (e) {
      throw wrap(l.name, e);
    }
    if (r.value === undefined) throw new Error(`${l.name}: did not return a result`);
    value = r.value;
  }
  return { result: value };
}
