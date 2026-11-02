import type { LoaderContext, RunOptions, RunResult } from './types';

export async function runLoaders(opts: RunOptions): Promise<RunResult> {
  const loaders = opts.loaders.map((name) => {
    const fn = opts.registry[name];
    if (!fn) throw new Error(`Unknown loader ${name}`);
    return fn;
  });
  const ctx: LoaderContext = { resourcePath: opts.resource };
  let value = await opts.readResource(opts.resource);
  for (let i = loaders.length - 1; i >= 0; i--) value = loaders[i].call(ctx, value);
  return { result: value };
}
