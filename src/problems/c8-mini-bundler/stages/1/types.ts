export interface BundleOptions {
  /** The entry module. */
  input: string;
  /** In-memory file system: absolute path to source. */
  files: Record<string, string>;
}

export interface Chunk {
  /** 'main' for the entry chunk. */
  name: string;
  /** The module this chunk starts from. */
  entry: string;
  isEntry: boolean;
  /** Dependencies first. */
  modules: string[];
}

export interface BundleResult {
  /** Just the main chunk. */
  chunks: Chunk[];
  /** Always [] in this stage. */
  cycles: string[][];
}

/** Import specifiers found in one module, in source order. */
export interface ScannedImports {
  /** `import … from 'x'`, `import 'x'` and `export … from 'x'`. */
  static: string[];
  /** `import('x')` with a string literal. */
  dynamic: string[];
}
