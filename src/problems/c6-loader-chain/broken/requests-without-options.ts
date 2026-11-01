// Bug: remaining/preceding requests drop loader options
export interface LoaderContext {
  resourcePath: string;
  options: Record<string, unknown>;
  data: Record<string, unknown>;
  async(): (err?: unknown, result?: unknown) => void;
  addDependency(file: string): void;
}
export interface Loader {
  (this: LoaderContext, source: unknown): unknown;
  pitch?: (this: LoaderContext, remainingRequest: string, precedingRequest: string, data: Record<string, unknown>) => unknown;
}
export interface RunOptions {
  resource: string;
  loaders: string[];
  registry: Record<string, Loader>;
  readResource(path: string): unknown;
}
export interface RunResult {
  result: unknown;
  dependencies: string[];
}

export function parseLoader(request: string): { name: string; options: Record<string, unknown> } {
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
  const deps: string[] = [opts.resource];
  const loaders = opts.loaders.map((request) => {
    const { name, options } = parseLoader(request);
    const fn = opts.registry[name];
    if (!fn) throw new Error(`Unknown loader ${name}`);
    const ctx: LoaderContext = {
      resourcePath: opts.resource,
      options,
      data: {},
      async: () => { throw new Error('async() called outside a loader'); },
      addDependency: (file) => { if (!deps.includes(file)) deps.push(file); },
    };
    return { request, name, fn, ctx };
  });

  let value: unknown;
  let start = loaders.length - 1;
  let short = false;
  for (let i = 0; i < loaders.length; i++) {
    const l = loaders[i];
    if (!l.fn.pitch) continue;
    const remaining = [...loaders.slice(i + 1).map((x) => x.name), opts.resource].join('!');
    const preceding = loaders.slice(0, i).map((x) => x.request).join('!');
    let r: { value: unknown };
    try {
      r = await call(l.fn.pitch, l.ctx, [remaining, preceding, l.ctx.data]);
    } catch (e) {
      throw wrap(l.name, e);
    }
    if (r.value !== undefined) {
      value = r.value;
      start = i - 1;
      short = true;
      break;
    }
  }
  if (!short) value = await opts.readResource(opts.resource);

  for (let i = start; i >= 0; i--) {
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
  return { result: value, dependencies: deps };
}
