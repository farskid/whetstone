type MaybePromise<T> = T | Promise<T>;
export interface Plugin {
  name: string;
  resolveId?(source: string, importer: string | undefined): MaybePromise<string | null | undefined>;
  load?(id: string): MaybePromise<string | null | undefined>;
  transform?(code: string, id: string): MaybePromise<string | null | undefined>;
}
export interface BundleOptions {
  input: string;
  files: Record<string, string>;
  plugins?: Plugin[];
}
export interface Chunk {
  name: string;
  entry: string;
  isEntry: boolean;
  modules: string[];
  requires: string[];
  code: string;
}
export interface BundleResult {
  chunks: Chunk[];
  cycles: string[][];
}

/** Provided: finds import specifiers in source order. */
export function scanImports(code: string): { static: string[]; dynamic: string[] } {
  const stat: string[] = [];
  const dyn: string[] = [];
  const re = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)|(?:^|[\n;])\s*(?:import\s*(['"])([^'"]+)\3|(?:import|export)\b[^'";]*?\bfrom\s*(['"])([^'"]+)\5)/g;
  for (let m; (m = re.exec(code)); ) {
    if (m[2] !== undefined) dyn.push(m[2]);
    else stat.push(m[4] ?? m[6]);
  }
  return { static: stat, dynamic: dyn };
}

export async function bundle(opts: BundleOptions): Promise<BundleResult> {
  throw new Error('Not implemented');
}
