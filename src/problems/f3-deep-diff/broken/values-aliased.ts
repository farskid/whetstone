// Bug: op values alias b
export type Operation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };

export interface DiffOptions {
  /** Identity of an array item. When given, reordered items become `move` ops. */
  objectHash?: (item: unknown, index: number) => string;
}

export class PatchError extends Error {
  constructor(message: string, public index: number, public operation: Operation) {
    super(message);
    this.name = 'PatchError';
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b || (a !== a && b !== b)) return true;
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && isEqual(a.getTime(), b.getTime());
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => isEqual(x, b[i]));
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && isEqual(a[k], b[k]));
  }
  return false;
}

function cloneValue<T>(v: T): T {
  if (v instanceof Date) return new Date(v.getTime()) as T;
  if (Array.isArray(v)) return v.map(cloneValue) as T;
  if (isObj(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = cloneValue(v[k]);
    return out as T;
  }
  return v;
}

export const escapeToken = (t: string) => t.replace(/~/g, '~0').replace(/\//g, '~1');
export const unescapeToken = (t: string) => t.replace(/~1/g, '/').replace(/~0/g, '~');

export function diff(a: unknown, b: unknown, options: DiffOptions = {}): Operation[] {
  const ops: Operation[] = [];
  walk(a, b, '', ops, options);
  return ops;
}

function walk(a: unknown, b: unknown, path: string, ops: Operation[], options: DiffOptions) {
  if (isEqual(a, b)) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (options.objectHash) return walkHashed(a, b, path, ops, options);
    const common = Math.min(a.length, b.length);
    for (let i = 0; i < common; i++) walk(a[i], b[i], `${path}/${i}`, ops, options);
    for (let i = a.length - 1; i >= b.length; i--) ops.push({ op: 'remove', path: `${path}/${i}` });
    for (let i = a.length; i < b.length; i++) ops.push({ op: 'add', path: `${path}/${i}`, value: b[i] });
    return;
  }
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) if (!Object.prototype.hasOwnProperty.call(b, k)) ops.push({ op: 'remove', path: `${path}/${escapeToken(k)}` });
    for (const k of Object.keys(b)) {
      const p = `${path}/${escapeToken(k)}`;
      if (!Object.prototype.hasOwnProperty.call(a, k)) ops.push({ op: 'add', path: p, value: b[k] });
      else walk(a[k], b[k], p, ops, options);
    }
    return;
  }
  ops.push({ op: 'replace', path, value: cloneValue(b) });
}

function walkHashed(a: unknown[], b: unknown[], path: string, ops: Operation[], options: DiffOptions) {
  const hash = options.objectHash!;
  const work = a.map((item, i) => ({ item, h: hash(item, i) }));
  const target = b.map((item, i) => hash(item, i));
  const remaining = new Map<string, number>();
  for (const h of target) remaining.set(h, (remaining.get(h) ?? 0) + 1);
  // Remove items whose identity is gone (or appears more often in a than in b), from the end.
  const keep = new Map(remaining);
  const drop: boolean[] = work.map((w) => {
    const n = keep.get(w.h) ?? 0;
    if (n > 0) { keep.set(w.h, n - 1); return false; }
    return true;
  });
  for (let i = work.length - 1; i >= 0; i--) {
    if (drop[i]) { ops.push({ op: 'remove', path: `${path}/${i}` }); work.splice(i, 1); }
  }
  for (let i = 0; i < b.length; i++) {
    const h = target[i];
    if (work[i]?.h !== h) {
      let j = -1;
      for (let k = i + 1; k < work.length; k++) if (work[k].h === h) { j = k; break; }
      if (j === -1) {
        ops.push({ op: 'add', path: `${path}/${i}`, value: cloneValue(b[i]) });
        work.splice(i, 0, { item: b[i], h });
        continue;
      }
      ops.push({ op: 'move', from: `${path}/${j}`, path: `${path}/${i}` });
      const [moved] = work.splice(j, 1);
      work.splice(i, 0, moved);
    }
    walk(work[i].item, b[i], `${path}/${i}`, ops, options);
  }
}

function parsePointer(path: string): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) throw new Error(`Invalid pointer "${path}"`);
  return path.slice(1).split('/').map(unescapeToken);
}

function arrayIndex(arr: unknown[], token: string, allowEnd: boolean): number {
  if (allowEnd && token === '-') return arr.length;
  if (!/^(0|[1-9]\d*)$/.test(token)) throw new Error(`Invalid array index "${token}"`);
  const i = Number(token);
  if (i > arr.length || (!allowEnd && i === arr.length)) throw new Error(`Index ${i} out of bounds`);
  return i;
}

function resolveParent(doc: unknown, tokens: string[]): unknown {
  let node = doc;
  for (const t of tokens.slice(0, -1)) {
    if (Array.isArray(node)) node = node[arrayIndex(node, t, false)];
    else if (isObj(node) && Object.prototype.hasOwnProperty.call(node, t)) node = node[t];
    else throw new Error(`Path not found at "${t}"`);
  }
  if (!Array.isArray(node) && !isObj(node)) throw new Error('Parent is not a container');
  return node;
}

function getAt(doc: unknown, path: string): unknown {
  const tokens = parsePointer(path);
  if (tokens.length === 0) return doc;
  const parent = resolveParent(doc, tokens);
  const last = tokens[tokens.length - 1];
  if (Array.isArray(parent)) return parent[arrayIndex(parent, last, false)];
  if (!Object.prototype.hasOwnProperty.call(parent, last)) throw new Error(`Path "${path}" not found`);
  return (parent as Record<string, unknown>)[last];
}

function addAt(doc: unknown, path: string, value: unknown): unknown {
  const tokens = parsePointer(path);
  if (tokens.length === 0) return value;
  const parent = resolveParent(doc, tokens);
  const last = tokens[tokens.length - 1];
  if (Array.isArray(parent)) parent.splice(arrayIndex(parent, last, true), 0, value);
  else (parent as Record<string, unknown>)[last] = value;
  return doc;
}

function removeAt(doc: unknown, path: string): unknown {
  const tokens = parsePointer(path);
  if (tokens.length === 0) throw new Error('Cannot remove the root');
  const parent = resolveParent(doc, tokens);
  const last = tokens[tokens.length - 1];
  if (Array.isArray(parent)) parent.splice(arrayIndex(parent, last, false), 1);
  else {
    if (!Object.prototype.hasOwnProperty.call(parent, last)) throw new Error(`Path "${path}" not found`);
    delete (parent as Record<string, unknown>)[last];
  }
  return doc;
}

export function applyPatch<T>(doc: T, ops: Operation[]): T {
  let out: unknown = cloneValue(doc);
  ops.forEach((op, index) => {
    try {
      switch (op.op) {
        case 'add':
          out = addAt(out, op.path, cloneValue(op.value));
          break;
        case 'remove':
          out = removeAt(out, op.path);
          break;
        case 'replace':
          getAt(out, op.path);
          out = parsePointer(op.path).length === 0 ? cloneValue(op.value) : addAt(removeAt(out, op.path), op.path, cloneValue(op.value));
          break;
        case 'move': {
          if (op.path === op.from) { getAt(out, op.from); break; }
          if (op.path.startsWith(op.from + '/')) throw new Error('Cannot move a value into one of its own children');
          const value = getAt(out, op.from);
          out = addAt(removeAt(out, op.from), op.path, value);
          break;
        }
        case 'copy':
          out = addAt(out, op.path, cloneValue(getAt(out, op.from)));
          break;
        case 'test':
          if (!isEqual(getAt(out, op.path), op.value)) throw new Error(`Test failed at "${op.path}"`);
          break;
        default:
          throw new Error(`Unknown op "${(op as { op: string }).op}"`);
      }
    } catch (e) {
      throw new PatchError(e instanceof Error ? e.message : String(e), index, op);
    }
  });
  return out as T;
}
