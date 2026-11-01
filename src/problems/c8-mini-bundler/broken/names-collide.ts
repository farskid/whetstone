// Bug: chunk names are not made unique
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

function joinPath(dir: string, rel: string): string {
  const parts = dir.split('/');
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (parts.length > 1) parts.pop(); }
    else parts.push(seg);
  }
  return parts.join('/') || '/';
}

interface ModuleRecord {
  id: string;
  code: string;
  staticDeps: string[];
  dynamicDeps: string[];
}

export async function bundle(opts: BundleOptions): Promise<BundleResult> {
  const plugins = opts.plugins ?? [];
  const files = opts.files;
  const lookup = (p: string) => [p, p + '.js', p + '/index.js'].find((c) => Object.prototype.hasOwnProperty.call(files, c));

  async function resolve(source: string, importer: string | undefined): Promise<string> {
    for (const p of plugins) {
      const r = await p.resolveId?.(source, importer);
      if (r != null) return r;
    }
    let found: string | undefined;
    if (importer === undefined) found = lookup(source);
    else if ((source.startsWith('./') || source.startsWith('../')) && !importer.startsWith('\0')) {
      found = lookup(joinPath(importer.slice(0, importer.lastIndexOf('/')), source));
    }
    if (found === undefined) {
      throw new Error(importer === undefined ? `Could not resolve entry "${source}"` : `Could not resolve "${source}" from "${importer}"`);
    }
    return found;
  }

  async function load(id: string): Promise<string> {
    for (const p of plugins) {
      const r = await p.load?.(id);
      if (r != null) return r;
    }
    if (!id.startsWith('\0') && Object.prototype.hasOwnProperty.call(files, id)) return files[id];
    throw new Error(`Could not load "${id}"`);
  }

  const graph = new Map<string, ModuleRecord>();
  async function visit(id: string): Promise<void> {
    if (graph.has(id)) return;
    const rec: ModuleRecord = { id, code: '', staticDeps: [], dynamicDeps: [] };
    graph.set(id, rec);
    let code = await load(id);
    for (const p of plugins) {
      const r = await p.transform?.(code, id);
      if (r != null) code = r;
    }
    rec.code = code;
    const found = scanImports(code);
    for (const s of found.static) {
      const r = await resolve(s, id);
      if (!rec.staticDeps.includes(r)) rec.staticDeps.push(r);
    }
    for (const s of found.dynamic) {
      const r = await resolve(s, id);
      if (!rec.dynamicDeps.includes(r)) rec.dynamicDeps.push(r);
    }
    for (const d of [...rec.staticDeps, ...rec.dynamicDeps]) await visit(d);
  }

  const entry = await resolve(opts.input, undefined);
  await visit(entry);

  const cycles: string[][] = [];
  const owner = new Map<string, number>();
  const chunks: Chunk[] = [];
  const usedNames = new Set<string>();
  const nameFor = (id: string, isEntry: boolean) => {
    const base = isEntry ? 'main' : id.replace(/^\0/, '').split('/').pop()!.replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]/g, '_');
    let name = base;
    usedNames.add(name);
    return name;
  };

  const queue: string[] = [entry];
  for (let ci = 0; ci < queue.length; ci++) {
    const chunkEntry = queue[ci];
    const isEntry = ci === 0;
    if (!isEntry && owner.has(chunkEntry)) continue;
    const idx = chunks.length;
    const modules: string[] = [];
    const requires = new Set<number>();
    const stack: string[] = [];
    const done = new Set<string>();
    const walk = (id: string) => {
      const o = owner.get(id);
      if (o !== undefined && o !== idx) { if (o !== 0) requires.add(o); return; }
      if (done.has(id)) return;
      const at = stack.indexOf(id);
      if (at >= 0) { cycles.push([...stack.slice(at), id]); return; }
      stack.push(id);
      for (const d of graph.get(id)!.staticDeps) walk(d);
      stack.pop();
      done.add(id);
      owner.set(id, idx);
      modules.push(id);
    };
    walk(chunkEntry);
    for (const id of modules) {
      for (const d of graph.get(id)!.dynamicDeps) {
        if (!owner.has(d) && !queue.includes(d)) queue.push(d);
      }
    }
    const code =
      modules.map((id) => `define(${JSON.stringify(id)}, function (module, exports, require) {\n${graph.get(id)!.code}\n});`).join('\n') +
      (isEntry ? `\nrequire(${JSON.stringify(chunkEntry)});` : '') + '\n';
    chunks.push({ name: nameFor(chunkEntry, isEntry), entry: chunkEntry, isEntry, modules, requires: [...requires].sort((a, b) => a - b).map(String), code });
  }
  for (const c of chunks) c.requires = c.requires.map((i) => chunks[Number(i)].name);
  return { chunks, cycles };
}
