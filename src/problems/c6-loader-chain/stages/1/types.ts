/** `this` inside a loader. One per loader in the chain, shared by its pitch and normal phase. */
export interface LoaderContext {
  resourcePath: string;
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
