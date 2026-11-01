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
  throw new Error('Not implemented');
}

export async function runLoaders(opts: RunOptions): Promise<RunResult> {
  throw new Error('Not implemented');
}
