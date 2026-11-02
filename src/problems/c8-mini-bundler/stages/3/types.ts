/** A hook may answer directly or with a promise. */
export type MaybePromise<T> = T | Promise<T>;

/** Hooks run in plugin order; null or undefined means "no answer". */
export interface Plugin {
  name: string;
  /** First non-null result is the id. importer is undefined for the entry. */
  resolveId?(source: string, importer: string | undefined): MaybePromise<string | null | undefined>;
  /** First non-null result is the module's code. */
  load?(id: string): MaybePromise<string | null | undefined>;
  /** Gets the previous code; null keeps it. */
  transform?(code: string, id: string): MaybePromise<string | null | undefined>;
}

export interface BundleOptions {
  /** The entry module. */
  input: string;
  /** In-memory file system: absolute path to source. */
  files: Record<string, string>;
  plugins?: Plugin[];
}

export interface Chunk {
  /** 'main' for the entry chunk. */
  name: string;
  /** The module this chunk starts from. */
  entry: string;
  isEntry: boolean;
  /** Dependencies first. */
  modules: string[];
  /** define() wrappers for each module, ending in '\n'. */
  code: string;
}

export interface BundleResult {
  /** Just the main chunk. */
  chunks: Chunk[];
  /** Circular import paths in the order found. */
  cycles: string[][];
}
