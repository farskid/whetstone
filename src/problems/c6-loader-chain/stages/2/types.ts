/** `this` inside a loader. One per loader in the chain, shared by its pitch and normal phase. */
export interface LoaderContext {
  resourcePath: string;
  /** Parsed from the loader's query ("css?modules=1"). */
  options: Record<string, unknown>;
  /** Makes the loader async: its result is what it passes to the callback. */
  async(): (err?: unknown, result?: unknown) => void;
}

/** Gets the previous result (or the resource) and returns the next one. */
export interface Loader {
  (this: LoaderContext, source: unknown): unknown;
}

export interface RunOptions {
  resource: string;
  /** Loader requests, left to right as written. */
  loaders: string[];
  registry: Record<string, Loader>;
  /** A value or a promise. */
  readResource(path: string): unknown;
}

export interface RunResult {
  result: unknown;
}
